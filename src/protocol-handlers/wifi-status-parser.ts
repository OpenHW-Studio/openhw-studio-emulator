/**
 * wifi-status-parser.ts
 * Parse ESP-IDF serial output for WiFi and BLE lifecycle events.
 * JavaScript port of velxio-master/backend/app/services/wifi_status_parser.py
 *
 * Typical ESP-IDF WiFi log patterns:
 *   I (xxx) wifi:wifi sta start
 *   I (xxx) wifi:new:<SSID>, old:...
 *   I (xxx) wifi:connected with <SSID>, aid = ...
 *   I (xxx) esp_netif_handlers: sta ip: 192.168.4.2, ...
 *   I (xxx) wifi:state: run -> init (0)
 *
 * Typical BLE patterns:
 *   I (xxx) BT_INIT: BT controller compile version ...
 *   I (xxx) GATTS: ...adverti...
 */

export interface WifiEvent {
  status: 'initializing' | 'connected' | 'got_ip' | 'disconnected';
  ssid?: string;
  ip?: string;
}

export interface BleEvent {
  status: 'initialized' | 'advertising';
}

// ── WiFi patterns ─────────────────────────────────────────────────────────────
const RE_WIFI_STA_START = /wifi\s*:\s*wifi\s+sta\s+start/i;
const RE_WIFI_CONNECTED = /wifi\s*:\s*connected\s+with\s+([^,\r\n]+)/i;
const RE_WIFI_GOT_IP    = /sta\s+ip:\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i;
const RE_WIFI_DISCONNECT = /wifi\s*:\s*state:\s*\S+\s*->\s*init\s*\(0\)/i;
const RE_WIFI_BEGIN      = /wifi\s*:\s*new\s*:\s*([^,\r\n]+)/i;
const RE_WIFI_MODE_STA   = /wifi\s*:\s*mode\s*:\s*sta/i;
const RE_WIFI_CONNECTING = /Connecting\s+to\s+WiFi/i;
const RE_WIFI_SCAN       = /wifi\s*:\s*scanDone/i;

// ── BLE patterns ──────────────────────────────────────────────────────────────
const RE_BLE_INIT = /BT_INIT.*BT\s+controller\s+compile/i;
const RE_BLE_ADV  = /(GATTS|GAP_BLE).*advert/i;

// ── Parse a single line ───────────────────────────────────────────────────────

export function parseWifiLine(line: string): WifiEvent | null {
  let m: RegExpMatchArray | null;

  m = RE_WIFI_GOT_IP.exec(line);
  if (m) return { status: 'got_ip', ip: m[1] };

  m = RE_WIFI_CONNECTED.exec(line);
  if (m) return { status: 'connected', ssid: m[1].trim() };

  m = RE_WIFI_BEGIN.exec(line);
  if (m) return { status: 'connected', ssid: m[1].trim() };

  if (RE_WIFI_STA_START.test(line) || RE_WIFI_MODE_STA.test(line)) {
    return { status: 'initializing' };
  }

  if (RE_WIFI_CONNECTING.test(line)) {
    return { status: 'connected', ssid: 'OpenHW-GUEST' };
  }

  if (RE_WIFI_DISCONNECT.test(line)) {
    return { status: 'disconnected' };
  }

  return null;
}

export function parseBleLine(line: string): BleEvent | null {
  if (RE_BLE_ADV.test(line)) return { status: 'advertising' };
  if (RE_BLE_INIT.test(line)) return { status: 'initialized' };
  return null;
}

// ── Parse a block of serial text ──────────────────────────────────────────────

export function parseSerialText(text: string): { wifi: WifiEvent[]; ble: BleEvent[] } {
  const wifi: WifiEvent[] = [];
  const ble: BleEvent[] = [];
  for (const line of text.split(/\r?\n/)) {
    const we = parseWifiLine(line);
    if (we) wifi.push(we);
    const be = parseBleLine(line);
    if (be) ble.push(be);
  }
  return { wifi, ble };
}

// ── Streaming parser for incremental serial data ───────────────────────────────

export class WiFiStatusStreamParser {
  private _buffer = '';
  private _onWifiEvent: (event: WifiEvent) => void;
  private _onBleEvent: (event: BleEvent) => void;

  constructor(
    onWifiEvent: (event: WifiEvent) => void,
    onBleEvent: (event: BleEvent) => void,
  ) {
    this._onWifiEvent = onWifiEvent;
    this._onBleEvent  = onBleEvent;
  }

  /** Feed incremental serial bytes/string */
  feed(data: string | Uint8Array): void {
    const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
    this._buffer += str;

    // Process complete lines
    const lines = this._buffer.split(/\r?\n/);
    // Keep the last (possibly incomplete) chunk in the buffer
    this._buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      const we = parseWifiLine(line);
      if (we) this._onWifiEvent(we);
      const be = parseBleLine(line);
      if (be) this._onBleEvent(be);
    }
  }

  reset(): void { this._buffer = ''; }
}
