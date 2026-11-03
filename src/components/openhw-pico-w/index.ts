import manifest from './manifest.json';
import { PicoWUI, BOUNDS, contextMenuDuringRun } from './ui';
import { BaseComponent } from '../BaseComponent';

// UI-only board shell (AVR-only execution reset): visual + pins only.
// The RP2040 CPU/runner logic returns from scratch with the pico-emu
// runner — do NOT resurrect the old rp2040js logic here.
class PicoWBoardShell extends BaseComponent {
  update(_cpuCycles: number, _currentWires: any[], _all: BaseComponent[]) {}
}

export default {
  manifest,
  LogicClass: PicoWBoardShell,
  UI: PicoWUI,
  BOUNDS,
  contextMenuDuringRun,
};
