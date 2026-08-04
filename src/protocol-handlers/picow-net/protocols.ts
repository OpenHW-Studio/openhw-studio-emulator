/**
 * picow-net/protocols.ts
 * L2/L3/L4 protocol parsers and encoders.
 * Ported from velxio-master/backend/app/services/picow_net/protocols.py
 *
 * Pure data structures with parse() / toBytes(). No I/O, no async, no state.
 */

import { internetChecksum, tcpUdpChecksum } from './checksums';
import {
  ETHERTYPE_ARP,
  ETHERTYPE_IPV4,
  IPPROTO_TCP,
  IPPROTO_UDP,
  BROADCAST_MAC,
} from './consts';

// ── DataView helpers ─────────────────────────────────────────────────────────

function dv(buf: Uint8Array): DataView {
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

function u16be(n: number): Uint8Array {
  return new Uint8Array([(n >> 8) & 0xff, n & 0xff]);
}

function u32be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

// ── Ethernet ─────────────────────────────────────────────────────────────────

export interface EthernetFrame {
  dst: Uint8Array;
  src: Uint8Array;
  ethertype: number;
  payload: Uint8Array;
}

export function parseEthernet(frame: Uint8Array): EthernetFrame {
  if (frame.length < 14) throw new Error(`Ethernet too short: ${frame.length}`);
  return {
    dst: frame.slice(0, 6),
    src: frame.slice(6, 12),
    ethertype: (frame[12] << 8) | frame[13],
    payload: frame.slice(14),
  };
}

export function makeEthernet(f: EthernetFrame): Uint8Array {
  return concat(f.dst, f.src, u16be(f.ethertype), f.payload);
}

// ── ARP ──────────────────────────────────────────────────────────────────────

export interface ArpPacket {
  htype: number;
  ptype: number;
  hlen: number;
  plen: number;
  opcode: number;
  sha: Uint8Array;  // sender hw addr
  spa: Uint8Array;  // sender protocol addr (IP)
  tha: Uint8Array;  // target hw addr
  tpa: Uint8Array;  // target protocol addr (IP)
}

export function parseArp(payload: Uint8Array): ArpPacket {
  if (payload.length < 28) throw new Error(`ARP too short: ${payload.length}`);
  const v = dv(payload);
  return {
    htype: v.getUint16(0),
    ptype: v.getUint16(2),
    hlen: payload[4],
    plen: payload[5],
    opcode: v.getUint16(6),
    sha: payload.slice(8, 14),
    spa: payload.slice(14, 18),
    tha: payload.slice(18, 24),
    tpa: payload.slice(24, 28),
  };
}

export function makeArp(a: ArpPacket): Uint8Array {
  const header = new Uint8Array(8);
  const v = dv(header);
  v.setUint16(0, a.htype);
  v.setUint16(2, a.ptype);
  header[4] = a.hlen;
  header[5] = a.plen;
  v.setUint16(6, a.opcode);
  return concat(header, a.sha, a.spa, a.tha, a.tpa);
}

// ── IPv4 ─────────────────────────────────────────────────────────────────────

export interface IPv4Packet {
  version: number;
  ihl: number;
  dscp: number;
  ecn: number;
  totalLength: number;
  ident: number;
  flags: number;
  fragOffset: number;
  ttl: number;
  protocol: number;
  checksum: number;
  src: Uint8Array;
  dst: Uint8Array;
  payload: Uint8Array;
}

export function parseIPv4(data: Uint8Array): IPv4Packet {
  if (data.length < 20) throw new Error(`IPv4 too short: ${data.length}`);
  const v = dv(data);
  const b0 = data[0];
  const version = b0 >> 4;
  const ihl = b0 & 0x0f;
  if (ihl < 5) throw new Error(`Bad IHL: ${ihl}`);
  const headerLen = ihl * 4;
  const totalLength = v.getUint16(2);
  const flagsFrag = v.getUint16(6);
  return {
    version,
    ihl,
    dscp: data[1] >> 2,
    ecn: data[1] & 0x3,
    totalLength,
    ident: v.getUint16(4),
    flags: flagsFrag >> 13,
    fragOffset: flagsFrag & 0x1fff,
    ttl: data[8],
    protocol: data[9],
    checksum: v.getUint16(10),
    src: data.slice(12, 16),
    dst: data.slice(16, 20),
    payload: data.slice(headerLen, totalLength),
  };
}

export function makeIPv4(pkt: IPv4Packet): Uint8Array {
  const ihl = 5;
  const totalLength = ihl * 4 + pkt.payload.length;
  const flagsFrag = (pkt.flags << 13) | pkt.fragOffset;
  const dscpEcn = (pkt.dscp << 2) | pkt.ecn;
  // Build header without checksum
  const header = new Uint8Array(20);
  const v = dv(header);
  header[0] = (4 << 4) | ihl;
  header[1] = dscpEcn;
  v.setUint16(2, totalLength);
  v.setUint16(4, pkt.ident);
  v.setUint16(6, flagsFrag);
  header[8] = pkt.ttl;
  header[9] = pkt.protocol;
  header.set(pkt.src, 12);
  header.set(pkt.dst, 16);
  const cksum = internetChecksum(header);
  v.setUint16(10, cksum);
  return concat(header, pkt.payload);
}

// ── TCP ──────────────────────────────────────────────────────────────────────

export interface TcpSegment {
  srcPort: number;
  dstPort: number;
  seq: number;
  ack: number;
  dataOffset: number;
  flags: number;
  window: number;
  checksum: number;
  urgPtr: number;
  options: Uint8Array;
  payload: Uint8Array;
}

export function parseTcp(segment: Uint8Array): TcpSegment {
  if (segment.length < 20) throw new Error(`TCP too short: ${segment.length}`);
  const v = dv(segment);
  const offFlags = v.getUint16(12);
  const dataOffset = (offFlags >> 12) & 0xf;
  const headerLen = dataOffset * 4;
  if (headerLen < 20 || headerLen > segment.length) throw new Error(`Bad TCP data_offset: ${dataOffset}`);
  return {
    srcPort: v.getUint16(0),
    dstPort: v.getUint16(2),
    seq: v.getUint32(4),
    ack: v.getUint32(8),
    dataOffset,
    flags: offFlags & 0x1ff,
    window: v.getUint16(14),
    checksum: v.getUint16(16),
    urgPtr: v.getUint16(18),
    options: segment.slice(20, headerLen),
    payload: segment.slice(headerLen),
  };
}

export function makeTcp(seg: TcpSegment, srcIp: Uint8Array, dstIp: Uint8Array): Uint8Array {
  // Pad options to 4-byte boundary
  let opts = seg.options;
  if (opts.length % 4 !== 0) {
    const padded = new Uint8Array(opts.length + (4 - opts.length % 4));
    padded.set(opts);
    opts = padded;
  }
  const dataOffset = (20 + opts.length) / 4;
  const offFlags = (dataOffset << 12) | (seg.flags & 0x1ff);
  const header = new Uint8Array(20);
  const v = dv(header);
  v.setUint16(0, seg.srcPort);
  v.setUint16(2, seg.dstPort);
  v.setUint32(4, seg.seq >>> 0);
  v.setUint32(8, seg.ack >>> 0);
  v.setUint16(12, offFlags);
  v.setUint16(14, seg.window);
  v.setUint16(16, 0);   // checksum placeholder
  v.setUint16(18, seg.urgPtr);
  const full = concat(header, opts, seg.payload);
  const cksum = tcpUdpChecksum(srcIp, dstIp, IPPROTO_TCP, full);
  const out = new Uint8Array(full);
  new DataView(out.buffer, out.byteOffset).setUint16(16, cksum);
  return out;
}

export function parseTcpOptions(opts: Uint8Array): Record<string, number | Uint8Array> {
  const out: Record<string, number | Uint8Array> = {};
  let i = 0;
  while (i < opts.length) {
    const kind = opts[i];
    if (kind === 0) break;       // End of option list
    if (kind === 1) { i++; continue; } // NOP
    if (i + 1 >= opts.length) break;
    const length = opts[i + 1];
    if (length < 2 || i + length > opts.length) break;
    const value = opts.slice(i + 2, i + length);
    if (kind === 2 && length === 4) { // MSS
      out.mss = (value[0] << 8) | value[1];
    } else if (kind === 3 && length === 3) { // Window scale
      out.wscale = value[0];
    } else {
      out[kind] = value;
    }
    i += length;
  }
  return out;
}

// ── UDP ──────────────────────────────────────────────────────────────────────

export interface UdpDatagram {
  srcPort: number;
  dstPort: number;
  length: number;
  checksum: number;
  payload: Uint8Array;
}

export function parseUdp(segment: Uint8Array): UdpDatagram {
  if (segment.length < 8) throw new Error(`UDP too short: ${segment.length}`);
  const v = dv(segment);
  const length = v.getUint16(4);
  return {
    srcPort: v.getUint16(0),
    dstPort: v.getUint16(2),
    length,
    checksum: v.getUint16(6),
    payload: segment.slice(8, length),
  };
}

export function makeUdp(seg: UdpDatagram, srcIp: Uint8Array, dstIp: Uint8Array): Uint8Array {
  const length = 8 + seg.payload.length;
  const header = new Uint8Array(8);
  const v = dv(header);
  v.setUint16(0, seg.srcPort);
  v.setUint16(2, seg.dstPort);
  v.setUint16(4, length);
  v.setUint16(6, 0);  // placeholder
  const full = concat(header, seg.payload);
  let cksum = tcpUdpChecksum(srcIp, dstIp, IPPROTO_UDP, full);
  if (cksum === 0) cksum = 0xffff; // RFC 768: 0xffff means "no cksum" disambiguation
  const out = new Uint8Array(full);
  new DataView(out.buffer, out.byteOffset).setUint16(6, cksum);
  return out;
}

// ── ICMP ─────────────────────────────────────────────────────────────────────

export interface IcmpMessage {
  type: number;
  code: number;
  checksum: number;
  rest: Uint8Array;   // 4 bytes (id + seq for echo)
  payload: Uint8Array;
}

export function parseIcmp(segment: Uint8Array): IcmpMessage {
  if (segment.length < 8) throw new Error(`ICMP too short: ${segment.length}`);
  return {
    type: segment[0],
    code: segment[1],
    checksum: (segment[2] << 8) | segment[3],
    rest: segment.slice(4, 8),
    payload: segment.slice(8),
  };
}

export function makeIcmp(msg: IcmpMessage): Uint8Array {
  const header = new Uint8Array(4);
  header[0] = msg.type;
  header[1] = msg.code;
  const withoutCksum = concat(header, msg.rest, msg.payload);
  const cksum = internetChecksum(withoutCksum);
  const out = new Uint8Array(withoutCksum);
  out[2] = (cksum >> 8) & 0xff;
  out[3] = cksum & 0xff;
  return out;
}

// ── Convenience builders ──────────────────────────────────────────────────────

export function makeFrameIPv4(
  dstMac: Uint8Array,
  srcMac: Uint8Array,
  srcIp: Uint8Array,
  dstIp: Uint8Array,
  protocol: number,
  l4Payload: Uint8Array,
  ttl = 64,
  ident = 0,
): Uint8Array {
  const ipPkt: IPv4Packet = {
    version: 4, ihl: 5, dscp: 0, ecn: 0,
    totalLength: 0,   // filled by makeIPv4
    ident, flags: 2, fragOffset: 0, ttl, protocol,
    checksum: 0,      // filled by makeIPv4
    src: srcIp, dst: dstIp, payload: l4Payload,
  };
  return makeEthernet({ dst: dstMac, src: srcMac, ethertype: ETHERTYPE_IPV4, payload: makeIPv4(ipPkt) });
}

export function makeFrameArp(dstMac: Uint8Array, srcMac: Uint8Array, arp: ArpPacket): Uint8Array {
  return makeEthernet({ dst: dstMac, src: srcMac, ethertype: ETHERTYPE_ARP, payload: makeArp(arp) });
}

// ── MSS option ────────────────────────────────────────────────────────────────
export function mssOption(mss: number): Uint8Array {
  return new Uint8Array([0x02, 0x04, (mss >> 8) & 0xff, mss & 0xff]);
}
