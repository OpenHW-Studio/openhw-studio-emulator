import manifest from './manifest.json';
import { IRTransmitterUI, IRTransmitterContextMenu, BOUNDS } from './ui';
import { IRTransmitterLogic } from './logic';
import { validation } from './validation';

export default {
    manifest,
    UI:                       IRTransmitterUI,
    LogicClass:               IRTransmitterLogic,
    BOUNDS,
    ContextMenu:              IRTransmitterContextMenu,
    contextMenuDuringRun:     true,
    contextMenuOnlyDuringRun: false,
    validation,
};
