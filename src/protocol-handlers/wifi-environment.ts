/**
 * wifi-environment.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared WiFi simulation environment — analogous to Wokwi's virtual WiFi
 * network. All WiFi-capable boards (ESP32, Pico W) and the WiFi AP component
 * participate in the same environment instance.
 *
 * Responsibilities:
 *  1. Registry of all active WiFi nodes (boards + APs) in the simulation.
 *  2. SSID/password negotiation: an `openhw-wifi-ap` component announces its
 *     network; boards pick the best matching one (first SSID match wins, then
 *     "OpenHW-GUEST" / "Wokwi-GUEST" open networks as fallback).
 *  3. Connection-state events forwarded to every registered listener.
 *  4. PCAP capture routing: each board has its own PcapWriter; the environment
 *     provides a unified download URL handler.
 *
 * This is a **pure in-process singleton** — no network I/O here.
 * Actual packet routing lives in:
 *   - PicowNetBridge  (Pico W — L2→L7 userspace stack)
 *   - QEMU esp32_wifi NIC + filter-dump (ESP32 — handled by qemuRunner.js)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface WiFiApConfig {
  /** Component ID of the WiFi AP component (e.g. "ap1") */
  componentId: string;
  ssid: string;
  password: string;
  /** 802.11 channel (1–13) */
  channel: number;
  /** Whether this AP has outbound internet access */
  internet: boolean;
}

export type WiFiConnectionStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'got_ip'
  | 'disconnected'
  | 'failed';

export interface WiFiNodeInfo {
  /** Component ID of the board */
  boardId: string;
  /** Board type — used for protocol selection */
  boardType: 'esp32' | 'pico-w';
  /** Currently connected AP config, or null if disconnected */
  connectedAp: WiFiApConfig | null;
  status: WiFiConnectionStatus;
  /** Assigned IP address (set when status === 'got_ip') */
  ipAddress?: string;
  /** Called when the environment delivers an inbound Ethernet frame to the board */
  onFrameIn?: (frame: Uint8Array) => void;
  /** Called when WiFi status changes */
  onStatusChange?: (status: WiFiConnectionStatus, info: Partial<WiFiNodeInfo>) => void;
}

export interface WiFiPacketEvent {
  boardId: string;
  direction: 'out' | 'in';   // out = board→internet, in = internet→board
  protocol: string;           // 'TCP' | 'UDP' | 'ARP' | 'ICMP' | 'DHCP' | 'DNS' | 'OTHER'
  srcIp: string;
  dstIp: string;
  srcPort?: number;
  dstPort?: number;
  length: number;
  timestampMs: number;
}

// ── WifiEnvironment singleton ─────────────────────────────────────────────────

export class WifiEnvironment {
  private static _instance: WifiEnvironment | null = null;

  private _aps: Map<string, WiFiApConfig> = new Map();
  private _nodes: Map<string, WiFiNodeInfo> = new Map();
  private _packetListeners: Set<(event: WiFiPacketEvent) => void> = new Set();
  private _statusListeners: Set<(boardId: string, status: WiFiConnectionStatus, info: Partial<WiFiNodeInfo>) => void> = new Set();

  /** Singleton — one environment per simulation context */
  static getInstance(): WifiEnvironment {
    if (!WifiEnvironment._instance) {
      WifiEnvironment._instance = new WifiEnvironment();
    }
    return WifiEnvironment._instance;
  }

  /** Reset for a new simulation run */
  static reset(): void {
    WifiEnvironment._instance = new WifiEnvironment();
  }

  // ── AP management ──────────────────────────────────────────────────────────

  /**
   * Called by the openhw-wifi-ap component when it is placed on canvas.
   * Broadcasts to all registered boards that a new AP is available.
   */
  announceAp(config: WiFiApConfig): void {
    this._aps.set(config.componentId, config);
    console.log(`[WiFiEnv] AP announced: SSID="${config.ssid}" ch=${config.channel} internet=${config.internet}`);
    // Notify any boards that are waiting for this SSID
    for (const node of this._nodes.values()) {
      if (node.status === 'scanning' || node.status === 'idle') {
        this._tryConnectBoard(node);
      }
    }
  }

  removeAp(componentId: string): void {
    const ap = this._aps.get(componentId);
    if (!ap) return;
    this._aps.delete(componentId);
    // Disconnect boards that were using this AP
    for (const node of this._nodes.values()) {
      if (node.connectedAp?.componentId === componentId) {
        this._setNodeStatus(node.boardId, 'disconnected', { connectedAp: null });
      }
    }
  }

  /** Enumerate all currently announced APs */
  getAps(): WiFiApConfig[] {
    return [...this._aps.values()];
  }

  // ── Board (node) registration ──────────────────────────────────────────────

  /**
   * Called by ESP32 or Pico W logic when simulation starts.
   * The board will be automatically connected to a matching AP if one exists.
   */
  registerBoard(info: WiFiNodeInfo): void {
    this._nodes.set(info.boardId, info);
    console.log(`[WiFiEnv] Board registered: ${info.boardId} (${info.boardType})`);
    this._tryConnectBoard(info);
  }

  unregisterBoard(boardId: string): void {
    this._nodes.delete(boardId);
  }

  getNode(boardId: string): WiFiNodeInfo | undefined {
    return this._nodes.get(boardId);
  }

  // ── Status update (called by board logic / bridge) ─────────────────────────

  updateStatus(boardId: string, status: WiFiConnectionStatus, extras?: Partial<WiFiNodeInfo>): void {
    const node = this._nodes.get(boardId);
    if (!node) return;
    this._setNodeStatus(boardId, status, extras);
  }

  // ── Packet event (called by PicowNetBridge and ESP32 wifiStatusParser) ────

  /** Emit a packet event — recorded for UI display and PCAP */
  emitPacketEvent(event: WiFiPacketEvent): void {
    for (const listener of this._packetListeners) {
      try { listener(event); } catch {}
    }
  }

  onPacket(listener: (event: WiFiPacketEvent) => void): () => void {
    this._packetListeners.add(listener);
    return () => this._packetListeners.delete(listener);
  }

  onStatusChange(
    listener: (boardId: string, status: WiFiConnectionStatus, info: Partial<WiFiNodeInfo>) => void
  ): () => void {
    this._statusListeners.add(listener);
    return () => this._statusListeners.delete(listener);
  }

  // ── AP matching ────────────────────────────────────────────────────────────

  /**
   * Find the best AP for a board trying to connect with a given SSID.
   * Falls back to the first open AP if no exact match, then to the
   * built-in "OpenHW-GUEST" / "Wokwi-GUEST" virtual AP.
   */
  findAp(desiredSsid?: string): WiFiApConfig | null {
    const allAps = [...this._aps.values()];

    // Exact SSID match first
    if (desiredSsid) {
      const exact = allAps.find(ap => ap.ssid === desiredSsid);
      if (exact) return exact;
    }

    // Any open AP (no password) — same as Wokwi-GUEST behaviour
    const open = allAps.find(ap => !ap.password);
    if (open) return open;

    // No AP component placed — synthesize a virtual open AP (Wokwi-GUEST / OpenHW-GUEST)
    return {
      componentId: '__virtual__',
      ssid: desiredSsid || 'OpenHW-GUEST',
      password: '',
      channel: 6,
      internet: true,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _tryConnectBoard(node: WiFiNodeInfo): void {
    const ap = this.findAp();
    if (!ap) return;
    // Only auto-connect if there's an AP with internet=true
    if (!ap.internet) return;
    node.connectedAp = ap;
    this._setNodeStatus(node.boardId, 'connecting', { connectedAp: ap });
  }

  private _setNodeStatus(boardId: string, status: WiFiConnectionStatus, extras?: Partial<WiFiNodeInfo>): void {
    const node = this._nodes.get(boardId);
    if (!node) return;
    Object.assign(node, { status, ...extras });
    node.onStatusChange?.(status, { ...node, ...extras });
    for (const listener of this._statusListeners) {
      try { listener(boardId, status, { ...node, ...extras }); } catch {}
    }
    console.log(`[WiFiEnv] ${boardId}: ${status}${extras?.ipAddress ? ` IP=${extras.ipAddress}` : ''}`);
  }
}

// ── Convenience re-export of singleton ───────────────────────────────────────

export const wifiEnvironment = WifiEnvironment.getInstance();
