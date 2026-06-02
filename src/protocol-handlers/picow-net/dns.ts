/**
 * picow-net/dns.ts
 * DNS proxy — resolves hostnames via the host's DNS resolver (fetch API).
 * Ported from velxio-master/backend/app/services/picow_net/dns.py
 *
 * In a browser context we cannot call arbitrary DNS directly, so we
 * resolve via a small trick: attempt an HTTP HEAD to determine reachability,
 * or use a Cloudflare/Google DNS-over-HTTPS (DoH) endpoint.
 *
 * For the emulator (Node.js / Electron context), we use Node's dns module.
 */

import { ETHERTYPE_IPV4, GATEWAY_IP, GATEWAY_MAC, IPPROTO_UDP, bytesEqual, bytesToIp, ipToBytes } from './consts';
import { UdpDatagram, IPv4Packet, makeFrameIPv4, makeUdp } from './protocols';

const DNS_PORT = 53;

export function isDnsTraffic(udp: UdpDatagram): boolean {
  return udp.dstPort === DNS_PORT;
}

// ── DNS Message (minimal) ─────────────────────────────────────────────────────

interface DnsQuestion {
  qname: string;
  qtype: number;
  qclass: number;
}

interface DnsMessage {
  txid: number;
  flags: number;
  questions: DnsQuestion[];
}

function parseDnsName(payload: Uint8Array, offset: number): [string, number] {
  const labels: string[] = [];
  let seenPointer = false;
  let returnOffset = offset;
  while (offset < payload.length) {
    const length = payload[offset];
    if (length === 0) { offset++; break; }
    if ((length & 0xc0) === 0xc0) {
      if (!seenPointer) { returnOffset = offset + 2; seenPointer = true; }
      offset = ((length & 0x3f) << 8) | payload[offset + 1];
      continue;
    }
    offset++;
    labels.push(String.fromCharCode(...payload.slice(offset, offset + length)));
    offset += length;
  }
  if (!seenPointer) returnOffset = offset;
  return [labels.join('.'), returnOffset];
}

function writeDnsName(name: string): Uint8Array {
  const out: number[] = [];
  for (const label of name.split('.')) {
    if (!label) continue;
    const enc = [...label].map(c => c.charCodeAt(0));
    out.push(Math.min(enc.length, 63));
    out.push(...enc.slice(0, 63));
  }
  out.push(0);
  return new Uint8Array(out);
}

function parseDns(payload: Uint8Array): DnsMessage | null {
  if (payload.length < 12) return null;
  const txid = (payload[0] << 8) | payload[1];
  const flags = (payload[2] << 8) | payload[3];
  const qdcount = (payload[4] << 8) | payload[5];
  const questions: DnsQuestion[] = [];
  let offset = 12;
  for (let i = 0; i < qdcount; i++) {
    const [qname, nextOffset] = parseDnsName(payload, offset);
    offset = nextOffset;
    if (offset + 4 > payload.length) break;
    const qtype = (payload[offset] << 8) | payload[offset + 1];
    const qclass = (payload[offset + 2] << 8) | payload[offset + 3];
    offset += 4;
    questions.push({ qname, qtype, qclass });
  }
  return { txid, flags, questions };
}

function buildDnsResponse(txid: number, qname: string, ip: Uint8Array): Uint8Array {
  const header = new Uint8Array(12);
  header[0] = (txid >> 8) & 0xff;
  header[1] = txid & 0xff;
  header[2] = 0x81; header[3] = 0x80; // QR=1, AA=0, RD=1, RA=1
  header[4] = 0; header[5] = 1;       // QDCOUNT=1
  header[6] = 0; header[7] = 1;       // ANCOUNT=1
  // Build question
  const question = [...writeDnsName(qname), 0, 1, 0, 1]; // type A, class IN
  // Build answer (pointer to question name)
  const answer = [
    0xc0, 0x0c,           // name pointer to offset 12
    0, 1,                 // type A
    0, 1,                 // class IN
    0, 0, 0, 60,          // TTL = 60s
    0, 4,                 // RDLENGTH = 4
    ...ip,
  ];
  return new Uint8Array([...header, ...question, ...answer]);
}

/** Resolve a hostname to an IPv4 address. Returns null on failure. */
async function resolveHostname(hostname: string): Promise<string | null> {
  // Try DNS-over-HTTPS via Cloudflare
  try {
    const resp = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
      headers: { Accept: 'application/dns-json' },
    });
    if (resp.ok) {
      const data: any = await resp.json();
      const answer = data?.Answer?.find((a: any) => a.type === 1);
      if (answer?.data) return answer.data;
    }
  } catch {}

  // Fallback: try Google DoH
  try {
    const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`);
    if (resp.ok) {
      const data: any = await resp.json();
      const answer = data?.Answer?.find((a: any) => a.type === 1);
      if (answer?.data) return answer.data;
    }
  } catch {}

  return null;
}

export class DnsResolver {
  private _cache = new Map<string, string>();

  async handle(
    chipMac: Uint8Array,
    srcIp: Uint8Array,
    udp: UdpDatagram,
  ): Promise<[Uint8Array, Uint8Array, UdpDatagram] | null> {
    const msg = parseDns(udp.payload);
    if (!msg || msg.questions.length === 0) return null;

    const question = msg.questions[0];
    if (question.qtype !== 1) return null; // Only handle A records

    const hostname = question.qname;
    let resolvedIp = this._cache.get(hostname);

    if (!resolvedIp) {
      // Check if it's already an IP
      if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
        resolvedIp = hostname;
      } else {
        resolvedIp = await resolveHostname(hostname) ?? undefined;
      }
      if (resolvedIp) this._cache.set(hostname, resolvedIp);
    }

    if (!resolvedIp) return null;

    const responsePayload = buildDnsResponse(msg.txid, hostname, ipToBytes(resolvedIp));
    const outUdp: UdpDatagram = {
      srcPort: DNS_PORT,
      dstPort: udp.srcPort,
      length: 0, checksum: 0,
      payload: responsePayload,
    };
    // Reply from our gateway IP to the chip's source IP
    return [srcIp, ipToBytes(GATEWAY_IP), outUdp];
  }
}

export function makeDnsFrame(
  chipMac: Uint8Array,
  srcIp: Uint8Array,
  dstIp: Uint8Array,
  udp: UdpDatagram,
): Uint8Array {
  const udpBytes = makeUdp(udp, srcIp, dstIp);
  return makeFrameIPv4(chipMac, GATEWAY_MAC, srcIp, dstIp, IPPROTO_UDP, udpBytes);
}
