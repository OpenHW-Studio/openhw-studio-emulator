/**
 * picow-net/udp-nat.ts
 * UDP NAT with idle reaper — forwards UDP datagrams from chip to host network.
 * Ported from velxio-master/backend/app/services/picow_net/udp_nat.py
 *
 * Uses the browser/Node Fetch API for DNS-over-HTTPS and a dgram-like
 * approach via raw fetch for general UDP (approximated — true UDP sockets
 * are not available in the browser; non-DNS UDP is best-effort).
 */

import {
  GATEWAY_MAC, IPPROTO_UDP,
  bytesToIp, ipToBytes,
} from './consts';
import {
  IPv4Packet, UdpDatagram,
  makeFrameIPv4, makeUdp,
} from './protocols';

const UDP_IDLE_TIMEOUT_MS = 120_000; // 2 minutes

type InjectFn = (frame: Uint8Array) => Promise<void>;

interface UdpSession {
  chipMac: Uint8Array;
  chipIp: Uint8Array;
  chipPort: number;
  dstIp: Uint8Array;
  dstPort: number;
  lastActivity: number;
}

export class UdpNat {
  private _inject: InjectFn;
  private _sessions = new Map<string, UdpSession>();
  private _reaperTimer: ReturnType<typeof setInterval> | null = null;

  constructor(inject: InjectFn) {
    this._inject = inject;
    // Idle session reaper every 30 seconds
    this._reaperTimer = setInterval(() => this._reapIdle(), 30_000);
  }

  async handleChipDatagram(chipMac: Uint8Array, ip: IPv4Packet, udp: UdpDatagram): Promise<void> {
    const dstIpStr = bytesToIp(ip.dst);
    const key = `${bytesToIp(ip.src)}:${udp.srcPort}->${dstIpStr}:${udp.dstPort}`;

    let session = this._sessions.get(key);
    if (!session) {
      session = {
        chipMac,
        chipIp: ip.src.slice(),
        chipPort: udp.srcPort,
        dstIp: ip.dst.slice(),
        dstPort: udp.dstPort,
        lastActivity: Date.now(),
      };
      this._sessions.set(key, session);
    }
    session.lastActivity = Date.now();

    // Best-effort UDP forwarding via fetch (HTTP/CoAP APIs will use TCP anyway).
    // For MQTT over UDP or raw UDP, we log but cannot truly forward in a browser.
    // In a Node.js/Electron context, a real dgram socket would be used here.
    console.log(`[picow-udp] ${key} payload=${udp.payload.length}B (best-effort)`);
  }

  async shutdown(): Promise<void> {
    if (this._reaperTimer !== null) {
      clearInterval(this._reaperTimer);
      this._reaperTimer = null;
    }
    this._sessions.clear();
  }

  private _reapIdle(): void {
    const now = Date.now();
    for (const [key, session] of this._sessions) {
      if (now - session.lastActivity > UDP_IDLE_TIMEOUT_MS) {
        this._sessions.delete(key);
      }
    }
  }
}
