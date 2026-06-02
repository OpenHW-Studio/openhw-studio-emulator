/**
 * picow-net/consts.ts
 * Network constants for the Pico W virtual network stack.
 * Ported from velxio-master/backend/app/services/picow_net/consts.py
 *
 * The simulated STA lives on 10.13.37.0/24:
 *   Gateway / DNS : 10.13.37.1   (we emulate this)
 *   Chip (Pico W) : 10.13.37.42  (handed out by DHCP)
 *
 * MAC addresses use the locally-administered prefix 02:42:DA:…
 * MUST stay in sync with the frontend's virtual-ap.ts if that exists.
 */

// ── L3 ─────────────────────────────────────────────────────────────────────
export const SUBNET         = '10.13.37.0/24';
export const NETMASK        = '255.255.255.0';
export const GATEWAY_IP     = '10.13.37.1';
export const DNS_IP         = '10.13.37.1';
export const STA_IP         = '10.13.37.42';
export const BROADCAST_IP   = '10.13.37.255';

// ── L2 ─────────────────────────────────────────────────────────────────────
export const STA_MAC: Uint8Array     = hexToBytes('0242da000042');
export const GATEWAY_MAC: Uint8Array = hexToBytes('0242da42ffff');
export const BROADCAST_MAC: Uint8Array = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);

// ── Tunables ────────────────────────────────────────────────────────────────
export const MTU             = 1500;
export const TCP_WINDOW      = 65535;
export const TCP_MSS         = MTU - 40;   // 1460
export const DHCP_LEASE_SEC  = 86400;
export const TCP_IDLE_TIMEOUT = 600_000;   // ms

// ── Ethertypes ──────────────────────────────────────────────────────────────
export const ETHERTYPE_IPV4  = 0x0800;
export const ETHERTYPE_ARP   = 0x0806;
export const ETHERTYPE_IPV6  = 0x86dd;

// ── IPv4 protocol numbers ───────────────────────────────────────────────────
export const IPPROTO_ICMP    = 1;
export const IPPROTO_TCP     = 6;
export const IPPROTO_UDP     = 17;

// ── TCP flag bits ───────────────────────────────────────────────────────────
export const TCP_FIN = 0x01;
export const TCP_SYN = 0x02;
export const TCP_RST = 0x04;
export const TCP_PSH = 0x08;
export const TCP_ACK = 0x10;
export const TCP_URG = 0x20;

// ── ARP opcodes ─────────────────────────────────────────────────────────────
export const ARP_REQUEST = 1;
export const ARP_REPLY   = 2;

// ── ICMP types ──────────────────────────────────────────────────────────────
export const ICMP_ECHO_REPLY      = 0;
export const ICMP_ECHO_REQUEST    = 8;
export const ICMP_DEST_UNREACHABLE = 3;

// ── DHCP message types ──────────────────────────────────────────────────────
export const DHCP_DISCOVER = 1;
export const DHCP_OFFER    = 2;
export const DHCP_REQUEST  = 3;
export const DHCP_DECLINE  = 4;
export const DHCP_ACK      = 5;
export const DHCP_NAK      = 6;
export const DHCP_RELEASE  = 7;
export const DHCP_INFORM   = 8;

// ── Helpers ─────────────────────────────────────────────────────────────────

export function ipToBytes(ip: string): Uint8Array {
  return new Uint8Array(ip.split('.').map(Number));
}

export function bytesToIp(b: Uint8Array | number[]): string {
  return Array.from(b).join('.');
}

export function hexToBytes(hex: string): Uint8Array {
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    result[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return result;
}

export function macToString(mac: Uint8Array | number[]): string {
  return Array.from(mac).map(b => b.toString(16).padStart(2, '0')).join(':');
}

export function bytesEqual(a: Uint8Array | number[], b: Uint8Array | number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
