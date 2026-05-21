import { validation } from './validation';
import manifest from './manifest.json';
import { LEDLogic } from './logic';
import { LEDUI, BOUNDS } from './ui';

let _nodeFs: any = null;
try {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        // @ts-ignore
        _nodeFs = eval("require('node:fs')");
    }
} catch (e) {}
const docHtml = '';

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
    LogicClass: LEDLogic,
    UI: LEDUI,
    ContextMenu: null,
    contextMenuDuringRun: false,
    BOUNDS,
    validation,
    doc: docHtml,
    uiRaw,
    logicRaw,
    validationRaw,
    autocoding: {
        arduino: {
            setup: "pinMode(13, OUTPUT);",
            loop: "digitalWrite(13, HIGH);\ndelay(500);\ndigitalWrite(13, LOW);\ndelay(500);"
        },
        micropython: {
            setup: "from machine import Pin\nfrom time import sleep\nled = Pin(25, Pin.OUT)",
            loop: "while True:\n    led.toggle()\n    sleep(0.5)"
        }
    },
    autowiring: {
        connections: [
            { from: "A", to: "arduino:13", via: "openhw-resistor", attrs: { value: "220" } },
            { from: "K", to: "arduino:GND" }
        ]
    }
};
