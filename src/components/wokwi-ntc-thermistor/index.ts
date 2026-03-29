import manifest from './manifest.json';
import { NTCThermistorUI, NTCThermistorContextMenu, BOUNDS } from './ui';
import { NTCThermistorLogic } from './logic';
import { validation } from './validation';
import docHtml from './doc/index.html?raw';

export default {
    manifest,
    UI:                       NTCThermistorUI,
    LogicClass:               NTCThermistorLogic,
    BOUNDS,
    ContextMenu:              NTCThermistorContextMenu,
    contextMenuDuringRun:     true,   // slider is live-usable while running
    contextMenuOnlyDuringRun: true,   // hide the menu when simulation is stopped
    validation,
    doc: docHtml,
};
