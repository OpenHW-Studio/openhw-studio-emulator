import { validation } from './validation';
import manifest from './manifest.json';
import { BatteryLogic } from './logic';
import { BatteryUI, BatteryContextMenu, BOUNDS } from './ui';

import fs from 'node:fs';

let uiRaw = '';
let logicRaw = '';
let validationRaw = '';
try {
    uiRaw = fs.readFileSync(new URL('./ui.tsx', import.meta.url), 'utf8');
} catch (e) {
    uiRaw = '';
}
try {
    logicRaw = fs.readFileSync(new URL('./logic.ts', import.meta.url), 'utf8');
} catch (e) {
    logicRaw = '';
}
try {
    validationRaw = fs.readFileSync(new URL('./validation.ts', import.meta.url), 'utf8');
} catch (e) {
    validationRaw = '';
}

export default {
    manifest,
    LogicClass: BatteryLogic,
    UI: BatteryUI,
    ContextMenu: BatteryContextMenu,
    contextMenuDuringRun: false,
    BOUNDS,
    validation,
    uiRaw,
    logicRaw,
    validationRaw,
};
