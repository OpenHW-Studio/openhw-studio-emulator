/**
 * network-worker-proxy.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side proxy to the dedicated Network Worker.
 *
 * PicoWLogic (and any other WiFi board) uses this instead of instantiating
 * PicowNetBridge directly. All calls are forwarded over a MessageChannel port
 * with zero-copy ArrayBuffer transfers for Ethernet frames.
 *
 * Usage:
 *   const proxy = NetworkWorkerProxy.getInstance();
 *   proxy.startBoard(boardId, true);
 *   proxy.deliverFrameOut(boardId, ethernetFrame);
 *   proxy.onFrameIn(boardId, (frame) => injectIntoChip(frame));
 *   proxy.onStatus(boardId, (status, ip, ssid) => updateUI(status, ip, ssid));
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { WiFiApConfig, WiFiConnectionStatus } from './wifi-environment';

// ── Message types ─────────────────────────────────────────────────────────────

export interface NetWorkerStatusMsg {
  boardId: string;
  status: WiFiConnectionStatus;
  ssid: string;
  ip: string;
  packetCount: number;
}

export interface NetWorkerFrameInMsg {
  boardId: string;
  frame: ArrayBuffer;  // Transferable — ownership transferred from worker
}

export interface NetWorkerPcapMsg {
  boardId: string;
  data: ArrayBuffer;   // Transferable
}

type StatusHandler = (status: WiFiConnectionStatus, ssid: string, ip: string, packetCount: number) => void;
type FrameInHandler = (frame: Uint8Array) => void;
type PcapHandler = (data: Uint8Array) => void;

// ── Singleton proxy ───────────────────────────────────────────────────────────

export class NetworkWorkerProxy {
  private static _instance: NetworkWorkerProxy | null = null;

  private _worker: Worker | null = null;
  private _port: MessagePort | null = null;
  private _ready = false;

  // Per-board callbacks
  private _statusHandlers  = new Map<string, StatusHandler[]>();
  private _frameInHandlers = new Map<string, FrameInHandler[]>();
  private _pcapHandlers    = new Map<string, PcapHandler[]>();

  // ── Singleton ──────────────────────────────────────────────────────────────

  static getInstance(): NetworkWorkerProxy {
    if (!NetworkWorkerProxy._instance) {
      NetworkWorkerProxy._instance = new NetworkWorkerProxy();
    }
    return NetworkWorkerProxy._instance;
  }

  static reset(): void {
    NetworkWorkerProxy._instance?.destroy();
    NetworkWorkerProxy._instance = null;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  private constructor() {
    this._boot();
  }

  private _boot(): void {
    try {
      // Vite / webpack worker import
      this._worker = new Worker(
        new URL('../workers/network.worker.ts', import.meta.url),
        { type: 'module', name: 'OpenHW-NetWorker' }
      );

      const channel = new MessageChannel();
      this._port = channel.port1;
      this._port.onmessage = (e) => this._onPortMessage(e);
      this._port.start();

      // Send port2 to the worker (same pattern as render worker)
      this._worker.postMessage({ type: 'SET_NET_PORT', port: channel.port2 }, [channel.port2]);
      this._ready = true;

      console.log('[NetProxy] Network Worker started');
    } catch (err) {
      console.error('[NetProxy] Failed to start Network Worker — falling back to in-process:', err);
      this._ready = false;
    }
  }

  destroy(): void {
    try {
      this._port?.postMessage({ type: 'RESET' });
      this._port?.close();
      this._worker?.terminate();
    } catch {}
    this._port   = null;
    this._worker = null;
    this._ready  = false;
  }

  get isReady(): boolean { return this._ready; }

  // ── Board management ───────────────────────────────────────────────────────

  startBoard(boardId: string, wifiEnabled: boolean, ssid?: string, password?: string): void {
    this._send({ type: 'START_BOARD', boardId, wifiEnabled, ssid, password });
  }

  stopBoard(boardId: string): void {
    this._send({ type: 'STOP_BOARD', boardId });
  }

  // ── Frame routing ──────────────────────────────────────────────────────────

  /**
   * Forward an outbound Ethernet frame (chip→host) to the network worker.
   * The ArrayBuffer is transferred — zero-copy, caller must not use it after this.
   */
  deliverFrameOut(boardId: string, frame: Uint8Array): void {
    if (!this._ready || !this._port) return;
    // Slice to get a fresh buffer we can transfer without worrying about
    // the original Uint8Array's underlying shared buffer.
    const buf = frame.buffer.slice(frame.byteOffset, frame.byteOffset + frame.byteLength) as ArrayBuffer;
    this._port.postMessage({ type: 'FRAME_OUT', boardId, frame: buf }, [buf]);
  }

  // ── AP management ──────────────────────────────────────────────────────────

  announceAp(config: WiFiApConfig): void {
    this._send({
      type: 'ANNOUNCE_AP',
      componentId: config.componentId,
      ssid:        config.ssid,
      password:    config.password,
      channel:     config.channel,
      internet:    config.internet,
    });
  }

  removeAp(componentId: string): void {
    this._send({ type: 'REMOVE_AP', componentId });
  }

  // ── PCAP download ──────────────────────────────────────────────────────────

  requestPcap(boardId: string): void {
    this._send({ type: 'GET_PCAP', boardId });
  }

  // ── Callback registration ──────────────────────────────────────────────────

  /** Register a callback for inbound Ethernet frames (host→chip). */
  onFrameIn(boardId: string, handler: FrameInHandler): () => void {
    if (!this._frameInHandlers.has(boardId)) this._frameInHandlers.set(boardId, []);
    this._frameInHandlers.get(boardId)!.push(handler);
    return () => {
      const handlers = this._frameInHandlers.get(boardId);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx !== -1) handlers.splice(idx, 1);
      }
    };
  }

  /** Register a callback for WiFi status updates. */
  onStatus(boardId: string, handler: StatusHandler): () => void {
    if (!this._statusHandlers.has(boardId)) this._statusHandlers.set(boardId, []);
    this._statusHandlers.get(boardId)!.push(handler);
    return () => {
      const handlers = this._statusHandlers.get(boardId);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx !== -1) handlers.splice(idx, 1);
      }
    };
  }

  /** Register a one-time callback for PCAP data. */
  onPcap(boardId: string, handler: PcapHandler): () => void {
    if (!this._pcapHandlers.has(boardId)) this._pcapHandlers.set(boardId, []);
    this._pcapHandlers.get(boardId)!.push(handler);
    return () => {
      const handlers = this._pcapHandlers.get(boardId);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx !== -1) handlers.splice(idx, 1);
      }
    };
  }

  // ── Internal message dispatch ──────────────────────────────────────────────

  private _onPortMessage(e: MessageEvent): void {
    const msg = e.data;
    const boardId: string = msg.boardId ?? '';

    switch (msg.type) {
      case 'FRAME_IN': {
        // Zero-copy: frame ArrayBuffer transferred from worker
        const frame = new Uint8Array(msg.frame as ArrayBuffer);
        for (const h of this._frameInHandlers.get(boardId) ?? []) {
          try { h(frame); } catch {}
        }
        break;
      }

      case 'WIFI_STATUS': {
        const { status, ssid, ip, packetCount } = msg as NetWorkerStatusMsg;
        for (const h of this._statusHandlers.get(boardId) ?? []) {
          try { h(status, ssid, ip, packetCount); } catch {}
        }
        break;
      }

      case 'PCAP_DATA': {
        const data = new Uint8Array(msg.data as ArrayBuffer);
        for (const h of this._pcapHandlers.get(boardId) ?? []) {
          try { h(data); } catch {}
        }
        // One-shot: clear handlers after delivery
        this._pcapHandlers.delete(boardId);
        break;
      }

      case 'ERROR': {
        console.error(`[NetProxy] Worker error for board ${boardId}:`, msg.message);
        break;
      }
    }
  }

  private _send(msg: Record<string, unknown>): void {
    if (!this._ready || !this._port) return;
    this._port.postMessage(msg);
  }
}

/** Module-level singleton accessor */
export const networkWorkerProxy = NetworkWorkerProxy.getInstance();
