import { validation } from './validation';
import manifest from './manifest.json';
import { ResistorLogic } from './logic';
import { ResistorUI, BOUNDS } from './ui';
const docHtml = '';
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
    LogicClass: ResistorLogic,
    UI: ResistorUI,
    BOUNDS,
    validation,
    doc: docHtml,
    uiRaw,
    logicRaw,
    validationRaw,
};
