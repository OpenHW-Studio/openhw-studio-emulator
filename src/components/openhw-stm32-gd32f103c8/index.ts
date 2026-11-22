import manifest from './manifest.json';
import { UI_OpenhwStm32Gd32f103c8, BOUNDS } from './ui';
import { BaseComponent } from '../BaseComponent';

// Board shell: svg/manifest/ui artwork for canvas + palette.
// The Cortex-M3 CPU/runner logic lives in the frontend stm32f1-runner
// (stm32f1-emu package, chip opt); this shell only carries visual state.
class OpenhwStm32Gd32f103c8Shell extends BaseComponent {
  update(_cpuCycles: number, _currentWires: any[], _all: BaseComponent[]) {}
}

export default {
  manifest,
  LogicClass: OpenhwStm32Gd32f103c8Shell,
  UI: UI_OpenhwStm32Gd32f103c8,
  BOUNDS,
};
