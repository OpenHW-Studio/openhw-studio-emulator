import { BaseComponent } from '../BaseComponent';
import { NetworkWorkerProxy } from '../../protocol-handlers/network-worker-proxy';
import type { WiFiConnectionStatus } from '../../protocol-handlers/wifi-environment';

function normalizePicoPin(pinId: string): string {
  const s = String(pinId || '').toUpperCase();
  if (/^GPIO\d+$/.test(s)) return `GP${s.slice(4)}`;
  if (/^D\d+$/.test(s)) return `GP${s.slice(1)}`;
  if (/^\d+$/.test(s)) return `GP${s}`;
  return s;
}

export class PicoWLogic extends BaseComponent {
  private txTimeout: any = null;
  private rxTimeout: any = null;
  // Cleanup callbacks returned by proxy.onFrameIn / proxy.onStatus
  private _unsubscribeFrameIn: (() => void) | null = null;
  private _unsubscribeStatus:  (() => void) | null = null;

  constructor(id: string, manifest: any) {
    super(id, manifest);
    this.state = {
      txActive:       false,
      rxActive:       false,
      builtInLed:     false,
      wirelessStatus: 'idle' as WiFiConnectionStatus,
      wifiConnected:  false,
      wifiSsid:       '',
      wifiIp:         '',
      wifiPacketCount: 0,
      ...this.state,
    };
  }

  // ── Simulation lifecycle ─────────────────────────────────────────────────────

  override onSimulationStart(): void {
    const wirelessMode = String(this.attrs?.wirelessMode ?? 'full');
    const wifiEnabled  = wirelessMode !== 'off';
    const ssid         = String(this.attrs?.wirelessSsid    ?? '');
    const password     = String(this.attrs?.wirelessPassword ?? '');

    if (!wifiEnabled) return;

    const proxy = NetworkWorkerProxy.getInstance();

    // Subscribe BEFORE start so we don't miss the first status event
    this._unsubscribeFrameIn = proxy.onFrameIn(this.id, (frame) => {
      this._injectFrameIntoChip(frame);
    });

    this._unsubscribeStatus = proxy.onStatus(
      this.id,
      (status, wifiSsid, wifiIp, wifiPacketCount) => {
        this.setState({
          wirelessStatus:  status,
          wifiConnected:   status === 'connected' || status === 'got_ip',
          wifiSsid,
          wifiIp,
          wifiPacketCount,
        });
      },
    );

    proxy.startBoard(this.id, wifiEnabled, ssid, password);
    this.setState({ wirelessStatus: 'connecting' });
  }

  override onSimulationStop(): void {
    this._unsubscribeFrameIn?.();
    this._unsubscribeStatus?.();
    this._unsubscribeFrameIn = null;
    this._unsubscribeStatus  = null;

    NetworkWorkerProxy.getInstance().stopBoard(this.id);

    this.setState({
      wirelessStatus:  'idle',
      wifiConnected:   false,
      wifiSsid:        '',
      wifiIp:          '',
      wifiPacketCount: 0,
    });
  }

  // ── Frame handling ────────────────────────────────────────────────────────────

  /**
   * Called by the RP2040 CYW43 gSPI emulator when the chip sends an Ethernet frame.
   * Hands off to the Network Worker — zero-copy, never blocks the CPU loop.
   */
  onEthernetFrameOut(frameBase64: string): void {
    const binary = atob(frameBase64);
    const frame  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) frame[i] = binary.charCodeAt(i);
    // deliverFrameOut transfers the ArrayBuffer — zero-copy
    NetworkWorkerProxy.getInstance().deliverFrameOut(this.id, frame);
  }

  /**
   * Inject an inbound Ethernet frame (delivered by the Network Worker) into the chip.
   * Routes as a board state event so the simulation worker can forward it to RP2040.
   */
  private _injectFrameIntoChip(frame: Uint8Array): void {
    const b64 = btoa(String.fromCharCode(...frame));
    this.setState({ _pendingEvent: { type: 'picow_packet_in', payload: { ether_b64: b64 } } });
  }

  /** Download the PCAP capture (browser only). Async — network worker sends PCAP_DATA back. */
  downloadPcap(): void {
    const proxy = NetworkWorkerProxy.getInstance();
    proxy.onPcap(this.id, (data) => {
      // Trigger browser download
      let binary = '';
      for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
      const url = `data:application/vnd.tcpdump.pcap;base64,${btoa(binary)}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `picow_${this.id}.pcap`;
      a.click();
    });
    proxy.requestPcap(this.id);
  }

  // ── GPIO / UART ───────────────────────────────────────────────────────────────

  onPinStateChange(pinId: string, isHigh: boolean, _cpuCycles: number) {
    const pin = normalizePicoPin(pinId);
    if (pin === 'GP1' || pin === 'GP5') {
      this.setState({ rxActive: true });
      if (this.rxTimeout) clearTimeout(this.rxTimeout);
      this.rxTimeout = setTimeout(() => { this.setState({ rxActive: false }); this.rxTimeout = null; }, 100);
    } else if (pin === 'GP0' || pin === 'GP4') {
      this.setState({ txActive: true });
      if (this.txTimeout) clearTimeout(this.txTimeout);
      this.txTimeout = setTimeout(() => { this.setState({ txActive: false }); this.txTimeout = null; }, 100);
    } else if (pin === 'GP25') {
      this.setState({ builtInLed: !!isHigh });
    }
  }

  update(_cpuCycles: number, _currentWires: any[], _allComponentsInstances: BaseComponent[]) {
    // Runtime CPU integration for RP2040 is handled in worker runners.
  }
}
