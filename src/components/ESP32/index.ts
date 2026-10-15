import manifest from './manifest.json';
import { Esp32UI, BOUNDS } from './ui';
import { BaseComponent } from '../BaseComponent';

// UI-only board shell (AVR-only execution reset): visual + pins only.
// The ESP32 CPU/runner logic returns from scratch with the esp32-emu
// runner — do NOT resurrect the old logic here.
class Esp32BoardShell extends BaseComponent {
  update(_cpuCycles: number, _currentWires: any[], _all: BaseComponent[]) {}
}

export default {
    manifest,
    LogicClass: Esp32BoardShell,
    UI: Esp32UI,
    BOUNDS
};
