import manifest from './manifest.json';
import { Openhw6502UI, BOUNDS } from './ui';
import { BaseComponent } from '../BaseComponent';

// UI-only board shell: visual + pins only.
// The CPU/runner logic lives in the frontend retro-runner (8086emu package,
// per-ISA Emulator); this shell only carries visual state.
class Openhw6502Shell extends BaseComponent {
  update(_cpuCycles: number, _currentWires: any[], _all: BaseComponent[]) {}
}

export default {
    manifest,
    LogicClass: Openhw6502Shell,
    UI: Openhw6502UI,
    BOUNDS,
};
