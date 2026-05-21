import { validation } from './validation';
import manifest from './manifest.json';
import { BatteryLogic } from './logic';
import { BatteryUI, BatteryContextMenu, BOUNDS } from './ui';

let _nodeFs: any = null;
try {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        // @ts-ignore
        _nodeFs = eval("require('node:fs')");
    }
} catch (e) {}


let uiRaw = '';
let logicRaw = '';
let validationRaw = '';
try {
    uiRaw = _nodeFs?.readFileSync(new URL('./ui.tsx', import.meta.url), 'utf8');
} catch (e) {
    uiRaw = '';
}
try {
    logicRaw = _nodeFs?.readFileSync(new URL('./logic.ts', import.meta.url), 'utf8');
} catch (e) {
    logicRaw = '';
}
try {
    validationRaw = _nodeFs?.readFileSync(new URL('./validation.ts', import.meta.url), 'utf8');
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
