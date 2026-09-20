// Component v2 golden reference (index.ts = declarative registry record only).
// No fs/process/document touches at module top — worker/import-safe everywhere.
// Raw-source harvesting moved to build time (emulatorLoader ?raw glob).
// svgUrl: bundler-resolved .svg art (Vite ?url / file loader); falls back to
// null when the toolchain does not handle .svg imports.
import { validation } from './validation';
import manifest from './manifest.json';
import { LEDLogic } from './logic';
import { LEDUI, BOUNDS } from './ui';
// @ts-ignore — resolved by Vite asset pipeline; plain tsc treats as untyped
import svgUrl from './led.svg?url';

export const svg = svgUrl || null;

export default {
    manifest,
    LogicClass: LEDLogic,
    UI: LEDUI,
    ContextMenu: null,
    contextMenuDuringRun: false,
    BOUNDS,
    validation,
    svg: svgUrl || null,
    doc: null,
    // Raw sources are harvested at build time by the frontend's ?raw glob
    // (emulatorLoader.collectRawComponentSources) and merged into the live
    // registry there. Kept as empty-string fields so ComponentLab / zip-upload
    // / backend-sync code that reads uiRaw/logicRaw keeps working.
    uiRaw: '',
    logicRaw: '',
    validationRaw: '',
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
