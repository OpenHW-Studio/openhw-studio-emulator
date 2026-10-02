import manifest from './manifest.json';
import { Pico2UI, BOUNDS, contextMenuDuringRun } from './ui';
import { BaseComponent } from '../BaseComponent';

// UI-only board shell: visual + pins only.
// The RP2350 CPU/runner logic lives in the frontend pico-runner
// (pico-emu package, arch m33/rv32); this shell only carries visual state.
class Pico2BoardShell extends BaseComponent {
  update(_cpuCycles: number, _currentWires: any[], _all: BaseComponent[]) {}
}

export default {
  manifest,
  LogicClass: Pico2BoardShell,
  UI: Pico2UI,
  BOUNDS,
  contextMenuDuringRun,
};
