/**
 * picow-net/dhcp.ts
 * DHCP server — hands the Pico W its IP address (10.13.37.42).
 * Ported from velxio-master/backend/app/services/picow_net/dhcp.py
 */

import {
  BROADCAST_IP, BROADCAST_MAC, DHCP_ACK, DHCP_DISCOVER, DHCP_LEASE_SEC,
  DHCP_OFFER, DHCP_REQUEST, DNS_IP, ETHERTYPE_IPV4, GATEWAY_IP, GATEWAY_MAC,
  IPPROTO_UDP, NETMASK, STA_IP, bytesEqual, ipToBytes,
} from './consts';
import { UdpDatagram, makeFrameIPv4, makeUdp, parseUdp } from './protocols';

const DHCP_MAGIC = new Uint8Array([0x63, 0x82, 0x53, 0x63]);
const DHCP_SERVER_PORT = 67;
const DHCP_CLIENT_PORT = 68;

function parseDhcpOptions(payload: Uint8Array): Map<number, Uint8Array> {
  const opts = new Map<number, Uint8Array>();
  let i = 0;
  // Skip fixed fields (236 bytes) + magic cookie (4 bytes) = 240
  i = 240;
  while (i < payload.length) {
    const code = payload[i];
    if (code === 0) { i++; continue; }
    if (code === 255) break;
    if (i + 1 >= payload.length) break;
    const length = payload[i + 1];
    opts.set(code, payload.slice(i + 2, i + 2 + length));
    i += 2 + length;
  }
  return opts;
}

function buildDhcpReply(
  msgType: number,
  xid: Uint8Array,
  chaddr: Uint8Array,
  yiaddr: Uint8Array,
): Uint8Array {
  const fixed = new Uint8Array(236);
  fixed[0] = 2; // BOOTREPLY
  fixed[1] = 1; // htype=Ethernet
  fixed[2] = 6; // hlen
  fixed.set(xid, 4);
  fixed.set(yiaddr, 16);
  fixed.set(ipToBytes(GATEWAY_IP), 20); // siaddr
  fixed.set(chaddr.slice(0, 16), 28);

  const options = [
    ...DHCP_MAGIC,
    53, 1, msgType,                                    // DHCP Message Type
    54, 4, ...ipToBytes(GATEWAY_IP),                   // Server Identifier
    51, 4, 0, 1, 81, 128,                              // Lease = 86400s
    1,  4, ...ipToBytes(NETMASK),                      // Subnet Mask
    3,  4, ...ipToBytes(GATEWAY_IP),                   // Router
    6,  4, ...ipToBytes(DNS_IP),                       // DNS server
    255,
  ];
  return new Uint8Array([...fixed, ...options]);
}

export function isDhcpTraffic(udp: UdpDatagram): boolean {
  return udp.dstPort === DHCP_SERVER_PORT && udp.srcPort === DHCP_CLIENT_PORT;
}

export class DhcpServer {
  /**
   * Handle a DHCP packet from the chip.
   * Returns [dstIp, srcIp, outUdp] if a reply should be sent, else null.
   */
  handle(chipMac: Uint8Array, udp: UdpDatagram): [Uint8Array, Uint8Array, UdpDatagram] | null {
    const payload = udp.payload;
    if (payload.length < 240) return null;
    if (!bytesEqual(payload.slice(236, 240), DHCP_MAGIC)) return null;

    const xid = payload.slice(4, 8);
    const chaddr = payload.slice(28, 44);
    const opts = parseDhcpOptions(payload);
    const msgType = opts.get(53)?.[0] ?? 0;

    let replyType: number;
    if (msgType === DHCP_DISCOVER) {
      replyType = DHCP_OFFER;
    } else if (msgType === DHCP_REQUEST) {
      replyType = DHCP_ACK;
    } else {
      return null; // ignore RELEASE, INFORM, etc.
    }

    const yiaddr = ipToBytes(STA_IP);
    const replyPayload = buildDhcpReply(replyType, xid, chaddr, yiaddr);
    const outUdp: UdpDatagram = {
      srcPort: DHCP_SERVER_PORT,
      dstPort: DHCP_CLIENT_PORT,
      length: 0, checksum: 0,
      payload: replyPayload,
    };
    return [ipToBytes(BROADCAST_IP), ipToBytes(GATEWAY_IP), outUdp];
  }
}

/** Build a complete Ethernet frame containing a DHCP reply. */
export function makeDhcpFrame(
  chipMac: Uint8Array,
  srcIp: Uint8Array,
  dstIp: Uint8Array,
  udp: UdpDatagram,
): Uint8Array {
  const udpBytes = makeUdp(udp, srcIp, dstIp);
  return makeFrameIPv4(BROADCAST_MAC, GATEWAY_MAC, srcIp, dstIp, IPPROTO_UDP, udpBytes);
}
