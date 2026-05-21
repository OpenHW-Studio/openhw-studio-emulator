import { validation } from './validation';
import manifest from './manifest.json';
import { ChargerLogic } from './logic';
import { ChargerUI, ChargerContextMenu, BOUNDS } from './ui';

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
