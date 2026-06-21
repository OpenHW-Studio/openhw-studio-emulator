/**
 * picow-net/bridge.ts
 * PicowNetBridge — top-level orchestrator for one Pico W simulation instance.
 *
 * Ported from velxio-master/backend/app/services/picow_net/bridge.py
 *
 * The chip emits Ethernet frames (from its CYW43439 gSPI driver).
 * Each frame arrives at `deliverPacketOut(frame)` which:
 *   1. Parses Ethernet header
 *   2. Dispatches to ARP responder, DHCP server, DNS proxy, ICMP, TCP NAT, or UDP NAT
 *   3. Inbound frames (host → chip) are pushed via `onFrameIn` callback
 *
 * PCAP: every frame in BOTH directions is recorded by the PcapWriter.
 */

import { WifiEnvironment, WiFiConnectionStatus } from '../wifi-environment';
import { ArpResponder } from './arp';
import {
  ETHERTYPE_ARP, ETHERTYPE_IPV4,
  GATEWAY_IP, GATEWAY_MAC,
  IPPROTO_ICMP, IPPROTO_TCP, IPPROTO_UDP,
  STA_IP,
  bytesEqual, bytesToIp, ipToBytes,
} from './consts';
import { DhcpServer, isDhcpTraffic, makeDhcpFrame } from './dhcp';
import { DnsResolver, isDnsTraffic, makeDnsFrame } from './dns';
import { IcmpResponder } from './icmp';
import { PcapWriter } from './pcap-writer';
import {
  EthernetFrame,
  IPv4Packet,
  UdpDatagram,
  makeFrameIPv4,
  makeUdp,
  parseEthernet,
  parseIPv4,
  parseTcp,
  parseUdp,
} from './protocols';
import { TcpNat } from './tcp-nat';
import { UdpNat } from './udp-nat';

export type FrameEmitFn = (eventType: string, payload: Record<string, unknown>) => void;

export class PicowNetBridge {
  readonly boardId: string;
  readonly wifiEnabled: boolean;
  private _emit: FrameEmitFn;
  private _running = false;
  private _chipMac: Uint8Array = new Uint8Array(6);

  private _arp: ArpResponder;
  private _dhcp: DhcpServer;
  private _dns: DnsResolver;
  private _icmp: IcmpResponder;
  private _tcp: TcpNat;
  private _udp: UdpNat;
  private _pcap: PcapWriter;

  constructor(boardId: string, emit: FrameEmitFn, wifiEnabled: boolean) {
    this.boardId = boardId;
    this._emit = emit;
    this.wifiEnabled = wifiEnabled;

    this._arp  = new ArpResponder();
    this._dhcp = new DhcpServer();
    this._dns  = new DnsResolver();
    this._icmp = new IcmpResponder();
    this._tcp  = new TcpNat((frame) => this._inject(frame));
    this._udp  = new UdpNat((frame) => this._inject(frame));
    this._pcap = new PcapWriter();
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  start(): void {
    this._running = true;
    const env = WifiEnvironment.getInstance();
    env.updateStatus(this.boardId, 'connecting');
    console.log(`[picow-bridge:${this.boardId}] started wifi_enabled=${this.wifiEnabled}`);
  }

  async stop(): Promise<void> {
    this._running = false;
    await this._tcp.shutdown();
    await this._udp.shutdown();
    console.log(`[picow-bridge:${this.boardId}] stopped — ${this._pcap.packetCount} packets captured`);
  }

  // ── Chip → host (outbound) ──────────────────────────────────────────────────

  async deliverPacketOut(etherBytes: Uint8Array): Promise<void> {
    if (!this._running || !this.wifiEnabled) return;

    // Record in PCAP
    this._pcap.writePacket(etherBytes);

    let frame: EthernetFrame;
    try { frame = parseEthernet(etherBytes); } catch { return; }

    // Track chip MAC from first frame
    if (frame.src.some(b => b !== 0)) this._chipMac = frame.src.slice();

    // ARP
    if (frame.ethertype === ETHERTYPE_ARP) {
      const reply = this._arp.handle(frame);
      if (reply) {
        this._pcap.writePacket(reply);
        await this._inject(reply);
      }
      return;
    }

    if (frame.ethertype !== ETHERTYPE_IPV4) return;

    let ip: IPv4Packet;
    try { ip = parseIPv4(frame.payload); } catch { return; }

    // ICMP (ping)
    if (ip.protocol === IPPROTO_ICMP) {
      const reply = this._icmp.handle(this._chipMac, ip);
      if (reply) {
        this._pcap.writePacket(reply);
        await this._inject(reply);
      }
      return;
    }

    // UDP
    if (ip.protocol === IPPROTO_UDP) {
      let udp: UdpDatagram;
      try { udp = parseUdp(ip.payload); } catch { return; }
      await this._handleUdp(ip, udp);
      return;
    }

    // TCP
    if (ip.protocol === IPPROTO_TCP) {
      let tcp;
      try { tcp = parseTcp(ip.payload); } catch { return; }
      await this._tcp.handleChipSegment(this._chipMac, ip, tcp);
      return;
    }
  }

  // ── Host → chip (inbound via _inject) ─────────────────────────────────────

  private async _inject(frame: Uint8Array): Promise<void> {
    if (!this._running) return;
    this._pcap.writePacket(frame);
    // Encode as base64 for the WebSocket message
    const b64 = btoa(String.fromCharCode(...frame));
    this._emit('picow_packet_in', { ether_b64: b64 });
  }

  // ── UDP dispatcher ─────────────────────────────────────────────────────────

  private async _handleUdp(ip: IPv4Packet, udp: UdpDatagram): Promise<void> {
    // DHCP
    if (isDhcpTraffic(udp)) {
      const result = this._dhcp.handle(this._chipMac, udp);
      if (!result) return;
      const [dstIp, srcIp, outUdp] = result;
      const frame = makeDhcpFrame(this._chipMac, srcIp, dstIp, outUdp);
      this._pcap.writePacket(frame);
      await this._inject(frame);

      // DHCP ACK = IP assigned → update WiFi status
      const msgType = outUdp.payload[240 + 2];  // option 53 value
      if (msgType === 5 /* DHCP_ACK */) {
        WifiEnvironment.getInstance().updateStatus(this.boardId, 'got_ip', { ipAddress: STA_IP });
      }
      return;
    }

    // DNS
    if (isDnsTraffic(udp) && bytesEqual(ip.dst, ipToBytes(GATEWAY_IP))) {
      const result = await this._dns.handle(this._chipMac, ip.src, udp);
      if (!result) return;
      const [chipDstIp, hostSrcIp, outUdp] = result;
      const frame = makeDnsFrame(this._chipMac, hostSrcIp, chipDstIp, outUdp);
      this._pcap.writePacket(frame);
      await this._inject(frame);
      return;
    }

    // Generic UDP NAT
    await this._udp.handleChipDatagram(this._chipMac, ip, udp);
  }

  // ── PCAP access ────────────────────────────────────────────────────────────

  /** Download the captured packets as a .pcap file (browser only). */
  downloadPcap(filename?: string): void {
    this._pcap.download(filename ?? `picow_${this.boardId}.pcap`);
  }

  /** Returns the raw PCAP bytes (for a Node.js file write or API endpoint). */
  getPcapBytes(): Uint8Array {
    return this._pcap.toBytes();
  }

  get packetCount(): number { return this._pcap.packetCount; }
}
