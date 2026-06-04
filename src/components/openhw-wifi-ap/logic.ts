/**
 * openhw-wifi-ap/logic.ts
 * WiFi Access Point component logic.
 *
 * Announces its SSID/password to the Network Worker so all WiFi boards
 * running in that worker can discover and connect to it.
 * Also updates the in-process WifiEnvironment for components that don't use
 * the worker (e.g., ESP32 via qemuRunner status parser).
 */

import { BaseComponent } from '../BaseComponent';
import { WifiEnvironment, type WiFiApConfig } from '../../protocol-handlers/wifi-environment';
import { NetworkWorkerProxy } from '../../protocol-handlers/network-worker-proxy';

export class WiFiApLogic extends BaseComponent {
  private _apConfig: WiFiApConfig | null = null;
  private _announced = false;

  constructor(id: string, manifest: any) {
    super(id, manifest);
    this.state = {
      ...this.state,
      ssid: '',
      channel: 6,
      hasPassword: false,
      internet: true,
      connectedBoards: 0,
    };
  }

  override onSimulationStart(): void {
    this._announce();
  }

  override onSimulationStop(): void {
    if (this._announced && this._apConfig) {
      // Remove from both the in-process env and the network worker
      WifiEnvironment.getInstance().removeAp(this._apConfig.componentId);
      NetworkWorkerProxy.getInstance().removeAp(this._apConfig.componentId);
      this._announced = false;
    }
  }

  override onAttrChange(key: string, value: string): void {
    super.onAttrChange(key, value);
    if (['ssid', 'password', 'channel', 'internet'].includes(key)) {
      this._announce();
    }
  }

  private _announce(): void {
    const ssid     = String(this.attrs?.ssid     ?? 'OpenHW-GUEST');
    const password = String(this.attrs?.password ?? '');
    const channel  = parseInt(String(this.attrs?.channel ?? '6'), 10) || 6;
    const internet = String(this.attrs?.internet ?? '1') !== '0';

    this._apConfig = { componentId: this.id, ssid, password, channel, internet };

    // Announce to in-process env (for ESP32 / other non-worker boards)
    WifiEnvironment.getInstance().announceAp(this._apConfig);

    // Announce to the Network Worker (for Pico W / worker-hosted boards)
    NetworkWorkerProxy.getInstance().announceAp(this._apConfig);

    this._announced = true;

    this.state.ssid        = ssid;
    this.state.channel     = channel;
    this.state.hasPassword = password.length > 0;
    this.state.internet    = internet;
    this.stateChanged      = true;

    console.log(`[openhw-wifi-ap] Announced SSID="${ssid}" ch=${channel} internet=${internet}`);
  }
}
