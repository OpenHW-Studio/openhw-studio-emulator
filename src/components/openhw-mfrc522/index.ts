import manifest from './manifest.json';
import { MFRC522UI, MFRC522ContextMenu, BOUNDS } from './ui';
import { MFRC522Logic } from './logic';
import { validation } from './validation';

let _nodeFs: any = null;
try {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        // @ts-ignore
        _nodeFs = eval("require('node:fs')");
    }
} catch (e) {}

let docHtml = '';
try {
    const docUrl = new URL('./doc/index.html', import.meta.url);
    docHtml = _nodeFs?.readFileSync(docUrl, 'utf8');
} catch (e) {
    docHtml = '';
}

export default {
    manifest,
    UI:                       MFRC522UI,
    LogicClass:               MFRC522Logic,
    BOUNDS,
    ContextMenu:              MFRC522ContextMenu,
    contextMenuDuringRun:     true,
    contextMenuOnlyDuringRun: false,
    validation,
    doc: docHtml,
};
