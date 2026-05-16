import { validation } from './validation';
import manifest from './manifest.json';
import { ChargerLogic } from './logic';
import { ChargerUI, ChargerContextMenu, BOUNDS } from './ui';

import uiRaw from './ui.tsx?raw';
import logicRaw from './logic.ts?raw';
import validationRaw from './validation.ts?raw';

export default {
    manifest,
    LogicClass: ChargerLogic,
    UI: ChargerUI,
    ContextMenu: ChargerContextMenu,
    contextMenuDuringRun: false,
    BOUNDS,
    validation,
    uiRaw,
    logicRaw,
    validationRaw,
};
