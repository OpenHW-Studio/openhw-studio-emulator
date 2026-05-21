import manifest from './manifest.json';
import fs from 'node:fs';
import { MAX30102UI, MAX30102ContextMenu, BOUNDS } from './ui';
import { MAX30102Logic } from './logic';
import { validation } from './validation';
const docHtml = '';

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
    UI: MAX30102UI,
    LogicClass: MAX30102Logic,
    BOUNDS,
    ContextMenu: MAX30102ContextMenu,
    contextMenuDuringRun: true,   // slider is live-usable while running
    contextMenuOnlyDuringRun: true,   // hide the menu when simulation is stopped
    validation,
    doc: docHtml,
    uiRaw,
    logicRaw,
    validationRaw,
};
