import manifest from './manifest.json';
import { IRReceiverUI, IRReceiverContextMenu, BOUNDS } from './ui';
import { IRReceiverLogic } from './logic';
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
    UI:                       IRReceiverUI,
    LogicClass:               IRReceiverLogic,
    BOUNDS,
    ContextMenu:              IRReceiverContextMenu,
    contextMenuDuringRun:     true,
    contextMenuOnlyDuringRun: false,
    validation,
    doc: docHtml,
};
