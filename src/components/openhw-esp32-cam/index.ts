import manifest from './manifest.json';
import { Esp32CamUI, BOUNDS } from './ui';
import { BaseComponent } from '../BaseComponent';

// UI-only board shell (AVR-only execution reset): visual + pins only.
// The ESP32-CAM logic returns from scratch with the esp32-emu runner.
class Esp32CamBoardShell extends BaseComponent {
  update(_cpuCycles: number, _currentWires: any[], _all: BaseComponent[]) {}
}

export default {
    manifest,
    LogicClass: Esp32CamBoardShell,
    UI: Esp32CamUI,
    BOUNDS,
};
