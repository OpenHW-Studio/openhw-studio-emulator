import manifest from './manifest.json';
import { STM32F4DiscoveryUI, BOUNDS } from './ui';
import { BaseComponent } from '../BaseComponent';

// Board shell: svg/manifest/ui artwork for canvas + palette.
// The Cortex-M4 CPU/runner logic lives in the frontend stm32f4-runner
// (stm32f4-emu package); this shell only carries visual state.
class Stm32F4Shell extends BaseComponent {
  update(_cpuCycles: number, _currentWires: any[], _all: BaseComponent[]) {}
}

export default {
    manifest,
    LogicClass: Stm32F4Shell,
    UI: STM32F4DiscoveryUI,
    BOUNDS,
};
