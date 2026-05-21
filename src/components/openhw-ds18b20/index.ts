import manifest from './manifest.json';
import { DS18B20UI, DS18B20ContextMenu, BOUNDS } from './ui';
import { DS18B20Logic } from './logic';
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
    // runtime environments that don't support importing raw HTML will fallback to empty doc
    docHtml = '';
}

export default {
    manifest,
    UI:                       DS18B20UI,
    LogicClass:               DS18B20Logic,
    BOUNDS,
    ContextMenu:              DS18B20ContextMenu,
    contextMenuDuringRun:     true,   // slider is live-usable while running
    contextMenuOnlyDuringRun: true,   // hide the menu when simulation is stopped
    validation,
    doc: docHtml,
};
