/**
 * Pico W network bridge wrapper for the local OpenHW gateway.
 *
 * The chip-side CYW43 emulator emits raw Ethernet frames. This bridge sends
 * those frames as binary WebSocket messages to the local gateway and forwards
 * binary frames from the gateway back into the chip.
 */

export interface WifiStatus {
  status: string;
  ssid?: string;
  ip?: string;
}

export interface PacketOutFrame { ether: Uint8Array; }
export interface PacketInFrame { ether: Uint8Array; }

function getTabSessionId(): string {
  const key = 'openhw-tab-session-id';
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    window.sessionStorage.setItem(key, id);
    return id;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

export class Cyw43Bridge {
  readonly boardId: string;
  wifiEnabled = false;

  onConnected: (() => void) | null = null;
  onDisconnected: (() => void) | null = null;
  onError: ((msg: string) => void) | null = null;
  onWifiStatus: ((s: WifiStatus) => void) | null = null;
  onPacketIn: ((p: PacketInFrame) => void) | null = null;

  private socket: WebSocket | null = null;
  private _connected = false;

  constructor(boardId: string) {
    this.boardId = boardId;
  }

  get connected(): boolean { return this._connected; }
  get clientId(): string { return `${getTabSessionId()}::${this.boardId}`; }

  connect(): void {
    if (!this.wifiEnabled) return;
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) return;

    const wsUrl = `ws://localhost:5099/api/network-gateway?sessionId=${encodeURIComponent(this.clientId)}`;
    const socket = new WebSocket(wsUrl);
    socket.binaryType = 'arraybuffer';
    this.socket = socket;

    socket.onopen = () => {
      this._connected = true;
      this.onConnected?.();
      this.onWifiStatus?.({ status: 'connecting' });
    };

    socket.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        this.onPacketIn?.({ ether: new Uint8Array(event.data) });
        return;
      }

      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg?.type === 'wifi_status' && msg.data) {
            this.onWifiStatus?.(msg.data as WifiStatus);
          }
        } catch {
          // Gateway greeting/status text is optional for the CYW43 path.
        }
      }
    };

    socket.onclose = () => {
      this._connected = false;
      this.onDisconnected?.();
    };

    socket.onerror = () => {
      this.onError?.('Pico W gateway WebSocket error');
    };
  }

  disconnect(): void {
    if (!this.socket) return;
    this.socket.close();
    this.socket = null;
    this._connected = false;
  }

  sendPacket(ether: Uint8Array): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(ether.buffer.slice(ether.byteOffset, ether.byteOffset + ether.byteLength));
  }
}
