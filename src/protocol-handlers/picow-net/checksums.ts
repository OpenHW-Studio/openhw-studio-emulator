/**
 * picow-net/checksums.ts
 * RFC 1071 Internet checksum + TCP/UDP pseudo-header checksum.
 * Ported from velxio-master/backend/app/services/picow_net/checksums.py
 */

/** RFC 1071 Internet checksum over any byte sequence. */
export function internetChecksum(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i + 1 < data.length; i += 2) {
    sum += (data[i] << 8) | data[i + 1];
  }
  if (data.length & 1) {
    sum += data[data.length - 1] << 8;
  }
  while (sum > 0xffff) {
    sum = (sum & 0xffff) + (sum >> 16);
  }
  return (~sum) & 0xffff;
}

/**
 * TCP/UDP checksum using IPv4 pseudo-header.
 * proto: IPPROTO_TCP=6, IPPROTO_UDP=17
 */
export function tcpUdpChecksum(
  srcIp: Uint8Array,
  dstIp: Uint8Array,
  proto: number,
  segment: Uint8Array,
): number {
  const pseudo = new Uint8Array(12 + segment.length);
  pseudo.set(srcIp, 0);
  pseudo.set(dstIp, 4);
  pseudo[8] = 0;
  pseudo[9] = proto;
  pseudo[10] = (segment.length >> 8) & 0xff;
  pseudo[11] = segment.length & 0xff;
  pseudo.set(segment, 12);
  return internetChecksum(pseudo);
}
