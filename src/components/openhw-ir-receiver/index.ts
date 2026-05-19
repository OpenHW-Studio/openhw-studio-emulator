import manifest from './manifest.json';
import { IRReceiverUI, IRReceiverContextMenu, BOUNDS } from './ui';
import { IRReceiverLogic } from './logic';
import { validation } from './validation';
import docHtml from './doc/index.html?raw';

export default {
    manifest,
    UI:                       IRReceiverUI,
    LogicClass:               IRReceiverLogic,
    BOUNDS,
    ContextMenu:              IRReceiverContextMenu,
    contextMenuDuringRun:     true,
    contextMenuOnlyDuringRun: false,
    validation,
    doc: docHtml,
};
