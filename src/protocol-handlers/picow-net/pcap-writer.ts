/**
 * picow-net/pcap-writer.ts
 * Libpcap-format packet capture writer.
 *
 * Produces a valid .pcap file (linktype 1 = LINKTYPE_ETHERNET) that
 * Wireshark can open directly — identical to what Wokwi offers.
 *
 * Format reference: https://wiki.wireshark.org/Development/LibpcapFileFormat
 *
 *  Global header (24 bytes):
 *    magic_number  = 0xa1b2c3d4
 *    version_major = 2
 *    version_minor = 4
 *    thiszone      = 0
 *    sigfigs       = 0
 *    snaplen       = 65535
 *    network       = 1  (LINKTYPE_ETHERNET)
 *
 *  Per-packet record (16 bytes + data):
 *    ts_sec, ts_usec, incl_len, orig_len, <data>
 */

const PCAP_MAGIC    = 0xa1b2c3d4;
const PCAP_MAJOR    = 2;
const PCAP_MINOR    = 4;
const PCAP_SNAPLEN  = 65535;
const PCAP_LINKTYPE = 1;   // LINKTYPE_ETHERNET

function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}

function u16le(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

export class PcapWriter {
  private _chunks: Uint8Array[] = [];
  private _packetCount = 0;

  constructor() {
    // Write global header
    this._chunks.push(concat(
      u32le(PCAP_MAGIC),
      u16le(PCAP_MAJOR),
      u16le(PCAP_MINOR),
      u32le(0),              // thiszone
      u32le(0),              // sigfigs
      u32le(PCAP_SNAPLEN),
      u32le(PCAP_LINKTYPE),
    ));
  }

  /**
   * Append one Ethernet frame to the capture.
   * @param frame  Raw Ethernet frame bytes
   * @param tsMs   Timestamp in milliseconds (defaults to Date.now())
   */
  writePacket(frame: Uint8Array, tsMs?: number): void {
    const now = tsMs ?? Date.now();
    const tsSec  = Math.floor(now / 1000);
    const tsUsec = (now % 1000) * 1000;
    const capLen = Math.min(frame.length, PCAP_SNAPLEN);
    this._chunks.push(concat(
      u32le(tsSec),
      u32le(tsUsec),
      u32le(capLen),
      u32le(frame.length),
      frame.slice(0, capLen),
    ));
    this._packetCount++;
  }

  /** Number of packets captured so far. */
  get packetCount(): number { return this._packetCount; }

  /**
   * Return the complete PCAP file as a Uint8Array.
   * Safe to call at any point — does not reset the writer.
   */
  toBytes(): Uint8Array {
    return concat(...this._chunks);
  }

  /**
   * Return a data: URL that can be used as an <a href> for download.
   * Works in browser context.
   */
  toDataUrl(): string {
    const bytes = this.toBytes();
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return `data:application/vnd.tcpdump.pcap;base64,${btoa(binary)}`;
  }

  /**
   * Trigger a browser download of the PCAP file.
   * @param filename  Suggested filename (default: wifi_capture.pcap)
   */
  download(filename = 'wifi_capture.pcap'): void {
    const url = this.toDataUrl();
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }

  /** Reset — clears all packets but keeps the global header. */
  reset(): void {
    this._chunks = [this._chunks[0]];
    this._packetCount = 0;
  }
}
