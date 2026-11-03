import manifest from './manifest.json';
import { Pico2EthUI, BOUNDS, contextMenuDuringRun } from './ui';
import { BaseComponent } from '../BaseComponent';

// UI-only board shell: visual + pins only.
// The RP2040/RP2350 CPU/runner logic lives in the frontend pico-runner
// (pico-emu package); this shell only carries visual state.
class OpenhwPico2EthShell extends BaseComponent {
  update(_cpuCycles: number, _currentWires: any[], _all: BaseComponent[]) {}
}

export default {
  manifest,
  LogicClass: OpenhwPico2EthShell,
  UI: Pico2EthUI,
  BOUNDS,
  contextMenuDuringRun,
};
