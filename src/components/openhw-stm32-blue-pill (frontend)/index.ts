import manifest from './manifest.json';
import { BluePillUI, BOUNDS } from './ui';
import { BaseComponent } from '../BaseComponent';

// UI-only board shell (AVR-only execution reset): visual + pins only.
// The STM32 logic returns from scratch with the stm32f1-emu runner.
class Stm32BoardShell extends BaseComponent {
  update(_cpuCycles: number, _currentWires: any[], _all: BaseComponent[]) {}
}

export default {
    manifest,
    LogicClass: Stm32BoardShell,
    UI: BluePillUI,
    BOUNDS,
};
