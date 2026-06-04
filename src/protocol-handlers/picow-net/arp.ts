/**
 * picow-net/arp.ts
 * ARP responder — answers ARP requests from the chip for the gateway IP.
 * Ported from velxio-master/backend/app/services/picow_net/arp.py
 */

import { ARP_REPLY, ARP_REQUEST, ETHERTYPE_ARP, ETHERTYPE_IPV4, GATEWAY_IP, GATEWAY_MAC, bytesEqual, ipToBytes } from './consts';
import { ArpPacket, EthernetFrame, makeArp, makeEthernet, parseArp } from './protocols';

export class ArpResponder {
  /** Returns an ARP reply frame if the frame is an ARP request targeting our gateway, else null. */
  handle(frame: EthernetFrame): Uint8Array | null {
    if (frame.ethertype !== ETHERTYPE_ARP) return null;
    let arp: ArpPacket;
    try { arp = parseArp(frame.payload); } catch { return null; }

    if (arp.opcode !== ARP_REQUEST) return null;
    if (!bytesEqual(arp.tpa, ipToBytes(GATEWAY_IP))) return null;

    const reply: ArpPacket = {
      htype: 1,
      ptype: ETHERTYPE_IPV4,
      hlen: 6,
      plen: 4,
      opcode: ARP_REPLY,
      sha: GATEWAY_MAC,
      spa: arp.tpa,   // our IP (gateway)
      tha: arp.sha,   // original sender's MAC
      tpa: arp.spa,   // original sender's IP
    };
    return makeEthernet({
      dst: frame.src,
      src: GATEWAY_MAC,
      ethertype: ETHERTYPE_ARP,
      payload: makeArp(reply),
    });
  }
}
