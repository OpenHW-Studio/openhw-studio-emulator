import manifest from './manifest.json';
import { OpenhwZ80UI, BOUNDS } from './ui';
import { BaseComponent } from '../BaseComponent';

// UI-only board shell: visual + pins only.
// The CPU/runner logic lives in the frontend retro-runner (8086emu package,
// per-ISA Emulator); this shell only carries visual state.
class OpenhwZ80Shell extends BaseComponent {
  update(_cpuCycles: number, _currentWires: any[], _all: BaseComponent[]) {}
}

export default {
    manifest,
    LogicClass: OpenhwZ80Shell,
    UI: OpenhwZ80UI,
    BOUNDS,
};
