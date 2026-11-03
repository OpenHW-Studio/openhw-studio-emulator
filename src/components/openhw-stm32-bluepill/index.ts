import manifest from './manifest.json';
import { STM32BluePillUI, BOUNDS } from './ui';
import { BaseComponent } from '../BaseComponent';

// UI-only board shell (AVR-only execution reset): visual + pins only.
// The STM32 logic returns from scratch with the stm32f1-emu runner.
class Stm32BluePillShell extends BaseComponent {
  update(_cpuCycles: number, _currentWires: any[], _all: BaseComponent[]) {}
}

export default {
    manifest,
    LogicClass: Stm32BluePillShell,
    UI: STM32BluePillUI,
    BOUNDS,
};
