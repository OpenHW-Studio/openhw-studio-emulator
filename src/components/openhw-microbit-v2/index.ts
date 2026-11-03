import manifest from './manifest.json';
import { MicrobitV2UI, BOUNDS } from './ui';
import { BaseComponent } from '../BaseComponent';

// UI-only board shell (worker MicrobitBoardLogic owns sim state): visual +
// pins only. The micro:bit logic returns from scratch with the
// microbit-runner (nRF52833 engine).
class MicrobitV2Shell extends BaseComponent {
  update(_cpuCycles: number, _currentWires: any[], _all: BaseComponent[]) {}
}

export default {
    manifest,
    LogicClass: MicrobitV2Shell,
    UI: MicrobitV2UI,
    BOUNDS,
};
