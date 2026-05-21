import manifest from './manifest.json';
import { IRReceiverUI, IRReceiverContextMenu, BOUNDS } from './ui';
import { IRReceiverLogic } from './logic';
import { validation } from './validation';
import fs from 'node:fs';

let docHtml = '';
try {
    const docUrl = new URL('./doc/index.html', import.meta.url);
    docHtml = fs.readFileSync(docUrl, 'utf8');
} catch (e) {
    docHtml = '';
}

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
