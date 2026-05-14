import { validation } from './validation';
import manifest from './manifest.json';
import { NTCThermistorLogic } from './logic';
import { NTCComparatorUI, NTCComparatorContextMenu, BOUNDS } from './ui';

export default {
    manifest,
    LogicClass: NTCThermistorLogic,
    UI: NTCComparatorUI,
    BOUNDS,
    ContextMenu: NTCComparatorContextMenu,
    contextMenuDuringRun: false,
    contextMenuOnlyDuringRun: true,
    validation,
};
