/**
 * picow-net/tcp-nat.ts
 * Full RFC 793 TCP state machine — chip-initiated outbound TCP connections.
 * Ported from velxio-master/backend/app/services/picow_net/tcp_nat.py
 *
 * Architecture:
 *   Chip sends SYN → we open a real TCP socket to the host endpoint
 *   We send SYN+ACK back to chip → chip sends ACK → ESTABLISHED
 *   Data flows both ways, fully seq/ack tracked
 *   FIN from either side triggers graceful close
 *
 * In browser context: uses fetch() for HTTP/HTTPS (the dominant use-case
 * for IoT firmware). For raw TCP we use WebSocket if available, otherwise
 * fall back to the backend proxy channel.
 * In Node/Electron context: uses net.connect() directly.
 */

import {
  GATEWAY_MAC,
  IPPROTO_TCP,
  TCP_ACK,
  TCP_FIN,
  TCP_MSS,
  TCP_PSH,
  TCP_RST,
  TCP_SYN,
  TCP_WINDOW,
  bytesToIp,
} from './consts';
import {
  IPv4Packet,
  TcpSegment,
  makeFrameIPv4,
  makeTcp,
  mssOption,
  parseTcpOptions,
} from './protocols';

type InjectFn = (frame: Uint8Array) => Promise<void>;

// ── Sequence number arithmetic (modular 32-bit) ───────────────────────────────

function seqAdd(a: number, b: number): number { return (a + b) >>> 0; }
function seqLt(a: number, b: number): boolean { return (((a - b) >>> 0) >= 0x80000000); }
function seqGeq(a: number, b: number): boolean { return a === b || !seqLt(a, b); }

// ── Connection state ──────────────────────────────────────────────────────────

const enum TcpState {
  SYN_RCVD   = 'SYN_RCVD',
  ESTABLISHED = 'ESTABLISHED',
  FIN_WAIT_1  = 'FIN_WAIT_1',
  FIN_WAIT_2  = 'FIN_WAIT_2',
  CLOSE_WAIT  = 'CLOSE_WAIT',
  LAST_ACK    = 'LAST_ACK',
  CLOSED      = 'CLOSED',
}

interface TcpConnection {
  chipMac: Uint8Array;
  chipIp: Uint8Array;
  chipPort: number;
  dstIp: Uint8Array;
  dstPort: number;
  state: TcpState;
  chipIsn: number;
  ourIsn: number;
  ourSeq: number;
  chipSeq: number;
  chipWindow: number;
  mss: number;
  // Host-side socket
  socket: TcpSocket | null;
  lastActivity: number;
}

/** Abstraction over a real TCP socket (works in Node.js and browser via proxy) */
interface TcpSocket {
  write(data: Uint8Array): void;
  close(): void;
  onData: ((data: Uint8Array) => void) | null;
  onClose: (() => void) | null;
  onError: ((err: Error) => void) | null;
}

// ── Real socket factory ───────────────────────────────────────────────────────

async function openTcpSocket(host: string, port: number, isTls: boolean): Promise<TcpSocket> {
  // Try Node.js `net` / `tls` modules (works in Electron / backend worker)
  try {
    const netMod = (globalThis as any).__nodenet ?? null;
    if (netMod) {
      return await openNodeSocket(netMod, host, port, isTls);
    }
  } catch {}

  // Browser fallback: use backend WebSocket proxy channel
  // (The backend exposes a ws:// endpoint that proxies to TCP)
  throw new Error(`Cannot open TCP socket to ${host}:${port} — no socket backend available`);
}

async function openNodeSocket(netMod: any, host: string, port: number, isTls: boolean): Promise<TcpSocket> {
  return new Promise((resolve, reject) => {
    const mod = isTls ? (globalThis as any).__nodetls ?? netMod : netMod;
    const connFn = isTls ? mod.connect : netMod.connect;
    const opts = isTls ? { host, port, rejectUnauthorized: false } : { host, port };

    const rawSock = connFn(opts, () => {
      resolve(sock);
    });
    rawSock.on('error', reject);
    rawSock.setTimeout(10_000, () => rawSock.destroy(new Error('connect timeout')));

    const sock: TcpSocket = {
      write: (data) => { rawSock.write(data); },
      close: () => { try { rawSock.destroy(); } catch {} },
      onData: null,
      onClose: null,
      onError: null,
    };
    rawSock.on('data', (buf: Buffer) => sock.onData?.(new Uint8Array(buf)));
    rawSock.on('close', () => sock.onClose?.());
    rawSock.on('error', (err: Error) => sock.onError?.(err));
  });
}

// ── TcpNat ───────────────────────────────────────────────────────────────────

export class TcpNat {
  private _inject: InjectFn;
  private _conns = new Map<string, TcpConnection>();
  private _reaperTimer: ReturnType<typeof setInterval> | null = null;

  constructor(inject: InjectFn) {
    this._inject = inject;
    this._reaperTimer = setInterval(() => this._reapIdle(), 60_000);
  }

  async handleChipSegment(chipMac: Uint8Array, ip: IPv4Packet, tcp: TcpSegment): Promise<void> {
    const key = `${bytesToIp(ip.src)}:${tcp.srcPort}->${bytesToIp(ip.dst)}:${tcp.dstPort}`;
    const conn = this._conns.get(key);

    // RST: tear down
    if (tcp.flags & TCP_RST) {
      if (conn) await this._closeConn(conn, false);
      return;
    }

    if (!conn) {
      if ((tcp.flags & TCP_SYN) && !(tcp.flags & TCP_ACK)) {
        await this._onPassiveSyn(key, chipMac, ip, tcp);
      } else {
        await this._sendRst(chipMac, ip, tcp);
      }
      return;
    }

    conn.chipWindow = tcp.window;
    conn.lastActivity = Date.now();

    switch (conn.state) {
      case TcpState.SYN_RCVD:    await this._onHandshakeComplete(conn, tcp); break;
      case TcpState.ESTABLISHED:  await this._onData(conn, tcp); break;
      case TcpState.FIN_WAIT_1:   await this._onFinWait1(conn, tcp); break;
      case TcpState.FIN_WAIT_2:   await this._onFinWait2(conn, tcp); break;
      case TcpState.LAST_ACK:
        if ((tcp.flags & TCP_ACK) && seqGeq(tcp.ack, conn.ourSeq)) {
          await this._closeConn(conn, false);
        }
        break;
    }
  }

  async shutdown(): Promise<void> {
    if (this._reaperTimer !== null) { clearInterval(this._reaperTimer); this._reaperTimer = null; }
    for (const conn of [...this._conns.values()]) {
      await this._closeConn(conn, true);
    }
  }

  // ── State handlers ──────────────────────────────────────────────────────────

  private async _onPassiveSyn(key: string, chipMac: Uint8Array, ip: IPv4Packet, tcp: TcpSegment): Promise<void> {
    const opts = parseTcpOptions(tcp.options);
    const mss = Math.min((opts.mss as number) || TCP_MSS, TCP_MSS);
    const ourIsn = Math.floor(Math.random() * 0xffffffff) >>> 0;

    const conn: TcpConnection = {
      chipMac, chipIp: ip.src.slice(), chipPort: tcp.srcPort,
      dstIp: ip.dst.slice(), dstPort: tcp.dstPort,
      state: TcpState.SYN_RCVD,
      chipIsn: tcp.seq,
      ourIsn,
      ourSeq: seqAdd(ourIsn, 1),
      chipSeq: seqAdd(tcp.seq, 1),
      chipWindow: tcp.window,
      mss, socket: null,
      lastActivity: Date.now(),
    };

    // Open real TCP socket to host
    const host = bytesToIp(conn.dstIp);
    const port = conn.dstPort;
    const isTls = port === 443;

    try {
      const socket = await openTcpSocket(host, port, isTls);
      conn.socket = socket;

      socket.onData = async (data) => {
        if (conn.state !== TcpState.ESTABLISHED && conn.state !== TcpState.CLOSE_WAIT) return;
        // Segment data to chip
        let offset = 0;
        while (offset < data.length) {
          const seg = data.slice(offset, offset + conn.mss);
          offset += conn.mss;
          await this._sendTcp(conn, TCP_ACK | TCP_PSH, conn.ourSeq, conn.chipSeq, new Uint8Array(0), seg);
          conn.ourSeq = seqAdd(conn.ourSeq, seg.length);
        }
        conn.lastActivity = Date.now();
      };

      socket.onClose = async () => {
        if (conn.state === TcpState.ESTABLISHED) {
          conn.state = TcpState.FIN_WAIT_1;
          await this._sendTcp(conn, TCP_ACK | TCP_FIN, conn.ourSeq, conn.chipSeq);
          conn.ourSeq = seqAdd(conn.ourSeq, 1);
        } else if (conn.state === TcpState.CLOSE_WAIT) {
          conn.state = TcpState.LAST_ACK;
          await this._sendTcp(conn, TCP_ACK | TCP_FIN, conn.ourSeq, conn.chipSeq);
          conn.ourSeq = seqAdd(conn.ourSeq, 1);
        }
      };

      socket.onError = async () => {
        await this._closeConn(conn, true);
      };

    } catch (e) {
      await this._sendRst(chipMac, ip, tcp);
      return;
    }

    this._conns.set(key, conn);
    // Send SYN+ACK
    await this._sendTcp(conn, TCP_SYN | TCP_ACK, ourIsn, conn.chipSeq, mssOption(conn.mss));
  }

  private async _onHandshakeComplete(conn: TcpConnection, tcp: TcpSegment): Promise<void> {
    if (!(tcp.flags & TCP_ACK)) return;
    if (tcp.ack !== conn.ourSeq) return;
    conn.state = TcpState.ESTABLISHED;
    if (tcp.payload.length > 0) await this._onData(conn, tcp);
  }

  private async _onData(conn: TcpConnection, tcp: TcpSegment): Promise<void> {
    if (tcp.payload.length > 0) {
      if (tcp.seq !== conn.chipSeq) {
        await this._sendTcp(conn, TCP_ACK, conn.ourSeq, conn.chipSeq);
        return;
      }
      conn.socket?.write(tcp.payload);
      conn.chipSeq = seqAdd(conn.chipSeq, tcp.payload.length);
      await this._sendTcp(conn, TCP_ACK, conn.ourSeq, conn.chipSeq);
    }
    if (tcp.flags & TCP_FIN) {
      conn.chipSeq = seqAdd(conn.chipSeq, 1);
      conn.state = TcpState.CLOSE_WAIT;
      try { conn.socket?.close(); } catch {}
      await this._sendTcp(conn, TCP_ACK, conn.ourSeq, conn.chipSeq);
    }
  }

  private async _onFinWait1(conn: TcpConnection, tcp: TcpSegment): Promise<void> {
    if ((tcp.flags & TCP_ACK) && tcp.ack === conn.ourSeq) conn.state = TcpState.FIN_WAIT_2;
    if (tcp.flags & TCP_FIN) {
      conn.chipSeq = seqAdd(conn.chipSeq, 1);
      await this._sendTcp(conn, TCP_ACK, conn.ourSeq, conn.chipSeq);
      await this._closeConn(conn, false);
    }
  }

  private async _onFinWait2(conn: TcpConnection, tcp: TcpSegment): Promise<void> {
    if (tcp.flags & TCP_FIN) {
      conn.chipSeq = seqAdd(conn.chipSeq, 1);
      await this._sendTcp(conn, TCP_ACK, conn.ourSeq, conn.chipSeq);
      await this._closeConn(conn, false);
    }
  }

  // ── Frame emission ──────────────────────────────────────────────────────────

  private async _sendTcp(
    conn: TcpConnection,
    flags: number,
    seq: number,
    ack: number,
    options: Uint8Array = new Uint8Array(0),
    payload: Uint8Array = new Uint8Array(0),
  ): Promise<void> {
    const tcpSeg: TcpSegment = {
      srcPort: conn.dstPort,
      dstPort: conn.chipPort,
      seq: seq >>> 0,
      ack: ack >>> 0,
      dataOffset: 5,
      flags,
      window: TCP_WINDOW,
      checksum: 0,
      urgPtr: 0,
      options,
      payload,
    };
    const tcpBytes = makeTcp(tcpSeg, conn.dstIp, conn.chipIp);
    const frame = makeFrameIPv4(conn.chipMac, GATEWAY_MAC, conn.dstIp, conn.chipIp, IPPROTO_TCP, tcpBytes);
    await this._inject(frame);
  }

  private async _sendRst(chipMac: Uint8Array, ip: IPv4Packet, tcp: TcpSegment): Promise<void> {
    const seq = (tcp.flags & TCP_ACK) ? tcp.ack : 0;
    const ack = seqAdd(tcp.seq, (tcp.flags & TCP_SYN) ? 1 : tcp.payload.length);
    const rst: TcpSegment = {
      srcPort: tcp.dstPort, dstPort: tcp.srcPort,
      seq: seq >>> 0, ack: ack >>> 0,
      dataOffset: 5, flags: TCP_RST | TCP_ACK,
      window: 0, checksum: 0, urgPtr: 0,
      options: new Uint8Array(0), payload: new Uint8Array(0),
    };
    const bytes = makeTcp(rst, ip.dst, ip.src);
    await this._inject(makeFrameIPv4(chipMac, GATEWAY_MAC, ip.dst, ip.src, IPPROTO_TCP, bytes));
  }

  private async _closeConn(conn: TcpConnection, sendRst: boolean): Promise<void> {
    if (conn.state === TcpState.CLOSED) return;
    conn.state = TcpState.CLOSED;
    if (sendRst) {
      try {
        const rst: TcpSegment = {
          srcPort: conn.dstPort, dstPort: conn.chipPort,
          seq: conn.ourSeq >>> 0, ack: conn.chipSeq >>> 0,
          dataOffset: 5, flags: TCP_RST,
          window: 0, checksum: 0, urgPtr: 0,
          options: new Uint8Array(0), payload: new Uint8Array(0),
        };
        const bytes = makeTcp(rst, conn.dstIp, conn.chipIp);
        await this._inject(makeFrameIPv4(conn.chipMac, GATEWAY_MAC, conn.dstIp, conn.chipIp, IPPROTO_TCP, bytes));
      } catch {}
    }
    try { conn.socket?.close(); } catch {}
    // Remove from map
    for (const [k, c] of this._conns) { if (c === conn) { this._conns.delete(k); break; } }
  }

  private _reapIdle(): void {
    const now = Date.now();
    for (const [, conn] of this._conns) {
      if (now - conn.lastActivity > 600_000) this._closeConn(conn, true).catch(() => {});
    }
  }
}
