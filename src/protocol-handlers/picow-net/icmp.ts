/**
 * picow-net/icmp.ts
 * ICMP echo responder (ping support).
 * Ported from velxio-master/backend/app/services/picow_net/icmp.py
 */

import { GATEWAY_MAC, IPPROTO_ICMP } from './consts';
import { ICMP_ECHO_REPLY, ICMP_ECHO_REQUEST } from './consts';
import { IPv4Packet, makeFrameIPv4, makeIcmp, parseIcmp } from './protocols';

export class IcmpResponder {
  /** Returns a reply frame if the packet is an ICMP echo request, else null. */
  handle(chipMac: Uint8Array, ip: IPv4Packet): Uint8Array | null {
    let icmp;
    try { icmp = parseIcmp(ip.payload); } catch { return null; }
    if (icmp.type !== ICMP_ECHO_REQUEST) return null;

    const reply = makeIcmp({
      type: ICMP_ECHO_REPLY,
      code: 0,
      checksum: 0,
      rest: icmp.rest,
      payload: icmp.payload,
    });
    return makeFrameIPv4(
      chipMac, GATEWAY_MAC,
      ip.dst, ip.src,
      IPPROTO_ICMP, reply,
    );
  }
}
