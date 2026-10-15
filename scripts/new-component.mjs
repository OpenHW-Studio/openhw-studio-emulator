#!/usr/bin/env node
// scripts/new-component.mjs — component v2 scaffolder (§12.4 migration step 4).
//
// Scaffolds BOTH flavors with the same manifest shape:
//   node scripts/new-component.mjs --type openhw-foo-sensor --runtime js \
//     --pins VCC,GND,SDA,SCL --group Sensors --w 80 --h 60
//   node scripts/new-component.mjs --type openhw-bar-display --runtime wasm \
//     --protocol spi --pins VCC,GND,CS,DC,MOSI,SCK --group Display --slotKind 3 \
//     --fields f0:brightness,i0:illuminated
//
// JS flavor:  manifest.json (+sab/ui/sim keys) | logic.ts (sim+validate+uiState)
//             | led-style <type>.svg | index.ts (declarative) | validation.ts (shim)
// WASM flavor: same + glue.ts (loader) + core-rs/ Rust crate stub (C ABI).
// WASM flavor ALSO takes --protocol spi|i2c|uart|pwm|onewire|i2s|pulse|
// twowire|digital|analog|neopixel|none (default: none) which selects the
// composed *BusFramer + route*() wiring in logic.ts. Protocols NEVER become
// base classes on the WASM path (single-dispatch rule — see
// docs/architecture/ts-vs-wasm-components.md).
// Never overwrites without --force. Validates the manifest with
// component-schema.js before writing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateComponentManifest } from '../src/components/component-schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = path.resolve(__dirname, '../src/components');

function arg(name, fallback = undefined) {
    const i = process.argv.indexOf(`--${name}`);
    if (i === -1) return fallback;
    const v = process.argv[i + 1];
    return v && !v.startsWith('--') ? v : true;
}

function toPascal(type) {
    return String(type || '')
        .split(/[-_]/g)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
}

function parseFields(spec) {
    const fields = {};
    if (!spec) return fields;
    for (const pair of String(spec).split(',')) {
        const [slot, name] = pair.split(':').map((s) => s.trim());
        if (slot && name) fields[slot] = name;
    }
    return fields;
}

const type = arg('type');
const runtime = String(arg('runtime', 'js') || 'js').toLowerCase();
const group = String(arg('group', 'Outputs'));
const w = Number(arg('w', 80));
const h = Number(arg('h', 60));
const pins = String(arg('pins', 'VCC,GND')).split(',').map((s) => s.trim()).filter(Boolean);
const slotKind = Number(arg('slotKind', 0));
const fields = parseFields(arg('fields', 'f0:value,i0:enabled'));
const protocol = String(arg('protocol', 'none') || 'none').toLowerCase();
const BUS_EXPORTS = {
    none: [],
    spi: ['on_spi'],
    i2c: ['on_i2c'],
    uart: ['on_uart'],
    pwm: ['on_pwm'],
    onewire: ['on_onewire'],
    i2s: ['on_i2s'],
    pulse: ['on_pulse'],
    twowire: ['on_twowire'],
    digital: ['on_digital'],
    analog: ['on_analog'],
    neopixel: ['on_neopixel'],
};
const PROTOCOL_FRAMER = {
    none: null,
    spi: { cls: 'SpiBusFramer', mod: '../../protocol-handlers/index', ctor: `new SpiBusFramer('CS', true, {\n        onByte: (byte, index) => this.busByte(byte, index),\n        onAssert: () => {},\n        onDeassert: () => {},\n    })` },
    i2c: { cls: 'I2cBusFramer', mod: '../../protocol-handlers/index', ctor: `new I2cBusFramer(0x00, {\n        onWriteRegister: (reg, data) => this.busWriteRegister(reg, data),\n        onReadRequest: (reg, count) => this.busReadRequest(reg, count),\n        onStop: () => {},\n    })` },
    uart: { cls: 'UartBusFramer', mod: '../../protocol-handlers/index', ctor: `new UartBusFramer({\n        onByte: (byte) => this.busUartByte(byte),\n    })` },
    pwm: { cls: 'PwmBusFramer', mod: '../../protocol-handlers/index', ctor: `new PwmBusFramer({\n        onSignal: (pinId, signal) => this.busPwmSignal(pinId, signal),\n    })` },
    onewire: { cls: 'OneWireBusFramer', mod: '../../protocol-handlers/index', ctor: `new OneWireBusFramer({\n        onConvertTemperature: () => {},\n        onReadScratchpad: () => [],\n    })` },
    i2s: { cls: 'I2sBusFramer', mod: '../../protocol-handlers/index', ctor: `new I2sBusFramer(1024, {\n        onFrame: (channel, normalized) => this.busI2sFrame(channel, normalized),\n    })` },
    pulse: { cls: 'PulseBusFramer', mod: '../../protocol-handlers/index', ctor: `new PulseBusFramer({\n        onPulse: (pinId, wasHigh, durationUs) => this.busPulse(pinId, wasHigh, durationUs),\n    })` },
    twowire: { cls: 'TwoWireBusFramer', mod: '../../protocol-handlers/index', ctor: `new TwoWireBusFramer({\n        onByte: (data) => this.busTwoWireByte(data),\n    })` },
    digital: { cls: 'DigitalBusFramer', mod: '../../protocol-handlers/index', ctor: `new DigitalBusFramer(0, {\n        onEdge: (pinId, isHigh, cycles) => this.busDigitalEdge(pinId, isHigh, cycles),\n    })` },
    analog: { cls: 'AnalogBusFramer', mod: '../../protocol-handlers/index', ctor: `new AnalogBusFramer(4, 0.05, {\n        onChange: (pinId, avgVoltage, rawAdc) => this.busAnalogChange(pinId, avgVoltage, rawAdc),\n    })` },
    neopixel: { cls: 'NeoPixelBusFramer', mod: '../../protocol-handlers/index', ctor: `new NeoPixelBusFramer(16, {\n        onFrame: (pixels) => this.busNeoPixelFrame(pixels),\n    })` },
};
const force = arg('force', false) === true || arg('force', false) === 'true';
const label = String(arg('label', toPascal(type)));

if (!type || !/^openhw-[a-z0-9-]+$/.test(type)) {
    console.error('Usage: new-component.mjs --type openhw-<name> [--runtime js|wasm] [--pins A,B] [--group X] [--w N] [--h N] [--slotKind N] [--fields f0:x,i0:y] [--label X] [--force]');
    process.exit(1);
}
if (runtime !== 'js' && runtime !== 'wasm') {
    console.error('Expected --runtime js|wasm, got: ' + runtime);
    process.exit(1);
}
if (!Object.prototype.hasOwnProperty.call(BUS_EXPORTS, protocol)) {
    console.error('Expected --protocol ' + Object.keys(BUS_EXPORTS).join('|') + ', got: ' + protocol);
    process.exit(1);
}
if (runtime === 'js' && protocol !== 'none') {
    console.error('NOTE: --protocol is a WASM-flavor option (framer wiring lives in the WASM logic.ts). JS-flavor components extend *Protocol base classes instead. Ignoring --protocol.');
}

const dir = path.join(COMPONENTS_DIR, type);
if (fs.existsSync(dir) && !force) {
    console.error(`Refusing to overwrite existing ${dir} (pass --force).`);
    process.exit(1);
}
fs.mkdirSync(dir, { recursive: true });

const className = `${toPascal(type)}Logic`;
const svgFile = `${type.replace(/^openhw-/, '')}.svg`;

const manifest = {
    type,
    label,
    description: `${label} component (v2 scaffold).`,
    group,
    w,
    h,
    attrs: {},
    telemetry: { template: '', criticalKeys: [] },
    pins: pins.map((id, i) => ({ id, x: Math.round((w / Math.max(pins.length - 1, 1)) * i), y: h, type: 'input', description: id })),
    autocoding: {},
    autowiring: { connections: [] },
    sab: { slotKind, fields },
    ui: { svg: `./${svgFile}`, interactive: [] },
    sim: { runtime, validation: 'inline' },
    ...(runtime === 'wasm' ? { wasm: { abi: 1, file: './core.wasm', exports: ['create', 'destroy', 'update', 'on_pin', ...BUS_EXPORTS[protocol === 'none' ? 'spi' : protocol].filter((e) => e !== 'on_pin'), 'get_state_ptr'], fallback: 'js' } } : {}),
};

const { valid, errors } = validateComponentManifest(manifest);
if (!valid) {
    console.error('Generated manifest FAILED schema validation:');
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
}

const framer = runtime === 'wasm' ? (PROTOCOL_FRAMER[protocol] || null) : null;
const logicTs = `import { ${runtime === 'wasm' ? 'WasmComponent' : 'BaseComponent'} } from '${runtime === 'wasm' ? '../WasmComponent' : '../BaseComponent'}';
${runtime === 'wasm' ? "import { ledGlueLoader as glueLoader } from './glue';" : ''}
${framer ? `import { ${framer.cls} } from '${framer.mod}';` : ''}

export class ${className} extends ${runtime === 'wasm' ? 'WasmComponent' : 'BaseComponent'} {
${framer ? `    // Owned ${framer.cls} (composition, NOT inheritance — single-dispatch rule).\n    private bus = ${framer.ctor};\n` : ''}    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { value: 0, enabled: false };
${runtime === 'wasm' ? '        this.setGlueLoader(glueLoader as any);\n' : ''}    }

${runtime === 'wasm' ? `    // WASM-first dispatch lives in WasmComponent.update(). This is the
    // REQUIRED slow-but-correct JS reference (runs when no core is loaded).
    protected fallbackUpdate(cpuCycles: number, wires: any[], instances: any[]): void {
        void cpuCycles; void wires; void instances;
        // TODO: implement sim. Keep it allocation-free: no JSON/Date in tick.
    }
` : `    update(cpuCycles: number, _wires: any[], _instances: any[]): void {
        // TODO: implement sim. Keep it allocation-free: no JSON/Date in tick.
        void cpuCycles;
    }
`}
    // SAB slot fields (must match manifest.sab.fields).
    uiState() {
        return {
            f: { value: Number(this.state?.value || 0) },
            i: { enabled: this.state?.enabled ? 1 : 0 },
        };
    }

    validate(component: any, graph: Map<string, string[]>) {
        const missing = (this.manifest?.pins || [])
            .map((p: any) => p.id)
            .filter((pid: string) => !(graph.get(\`\${component.id}.\${pid}\`) || []).length);
        if (missing.length === (this.manifest?.pins || []).length && missing.length > 0) {
            return {
                ruleId: '${type}-disconnected',
                severity: 'warn',
                message: \`[\${component.id}] is completely disconnected.\`,
                compIds: [component.id],
                remediation: 'Wire the component into the circuit.',
            };
        }
        return null;
    }
}
`;

const shimTs = `// Backward-compat shim — validation lives in logic.ts::validate().
import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';
import { ${className} } from './logic';

const delegate = ${className}.prototype.validate
    ? (component: any, graph: Map<string, string[]>) =>
        ${className}.prototype.validate!.call(undefined, component, graph)
    : (_component: any, _graph: Map<string, string[]>) => null;

export const validation: { rules: ComponentValidationRule[] } = {
    rules: [
        {
            id: '${type}-disconnected',
            name: '${label} connection check',
            severity: 'warn',
            priority: 10,
            description: 'Warn when the component is completely disconnected.',
            check: (component: any, graph: Map<string, string[]>) => {
                const raw = delegate(component, graph);
                if (!raw) return null;
                return createValidationIssue({
                    ruleId: String(raw.ruleId || '${type}-disconnected'),
                    severity: raw.severity || 'warn',
                    message: String(raw.message || ''),
                    compIds: raw.compIds || [component.id],
                    remediation: raw.remediation,
                });
            }
        }
    ]
};
`;

const indexTs = `// ${type} — component v2 registry record (declarative, worker-safe).
import { validation } from './validation';
import manifest from './manifest.json';
import { ${className} } from './logic';
// @ts-ignore — Vite asset pipeline
import svgUrl from './${svgFile}?url';

export const svg = svgUrl || null;

export default {
    manifest,
    LogicClass: ${className},
    UI: null, // svg art via manifest.ui.svg + Web Component (no ui.tsx for v2)
    ContextMenu: null,
    contextMenuDuringRun: false,
    BOUNDS: { x: 0, y: 0, w: ${w}, h: ${h} },
    validation,
    svg: svgUrl || null,
    doc: null,
    uiRaw: '',
    logicRaw: '',
    validationRaw: '',
};
`;

const svg = `<svg width="100%" height="100%" style="overflow:visible" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" data-component="${type}" data-bind-root="true">
  <!-- TODO: replace with real art. Bind dynamics via data-bind="..." (see openhw-led/led.svg). -->
  <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="6" fill="#1f2937" stroke="#6b7280" stroke-width="2" />
  <text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="middle" fill="#e5e7eb" font-size="12" font-family="sans-serif">${label}</text>
</svg>
`;

fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 4) + '\n');
fs.writeFileSync(path.join(dir, 'logic.ts'), logicTs);
fs.writeFileSync(path.join(dir, 'validation.ts'), shimTs);
fs.writeFileSync(path.join(dir, 'index.ts'), indexTs);
fs.writeFileSync(path.join(dir, svgFile), svg);

if (runtime === 'wasm') {
    const busExport = BUS_EXPORTS[protocol === 'none' ? 'spi' : protocol].find((e) => e !== 'on_pin');
    const glueTs = `// ${type} glue — WASM loader (separate from index.ts by design).
import type { WasmCore, WasmGlueLoader } from '../WasmComponent';

export const WASM_ABI_VERSION = 1;

export const glueLoader: WasmGlueLoader = {
    async load(manifest: any): Promise<WasmCore | null> {
        const wantAbi = Number(manifest?.wasm?.abi ?? WASM_ABI_VERSION);
        if (wantAbi !== WASM_ABI_VERSION) {
            console.warn(\`[${type} glue] ABI mismatch (want \${wantAbi}); using JS fallback.\`);
            return null;
        }
        // TODO: const mod = await import('./core/<name>.js'); const wasmUrlMod =
        //   await import('./core/<name>_bg.wasm?url'); const wasm = await mod.default(...);
        // Bind create/destroy/update/${busExport || 'on_pin'}/get_state_ptr into a WasmCore.
        // Until then JS fallback wins (return null).
        return null;
    },
};
`;
    fs.writeFileSync(path.join(dir, 'glue.ts'), glueTs);
    const crateDir = path.join(dir, 'core-rs');
    fs.mkdirSync(path.join(crateDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(crateDir, 'Cargo.toml'), `[package]\nname = "${type.replace(/-/g, '_')}_core"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib"]\n\n[dependencies]\nwasm-bindgen = "0.2"\n`);
    // wasm-bindgen dep is REQUIRED for wasm-pack --target web (glue ?url pattern).
    const rustBusFn = { spi: 'on_spi(_h: u32, _data: u32) -> u32 { 0xFF }', i2c: 'on_i2c(_h: u32, _addr: u32, _data: u32) -> u32 { 1 }', uart: 'on_uart(_h: u32, _data: u32) {}', pwm: 'on_pwm(_h: u32, _pin: u32, _duty: f32, _freq: f32) {}', onewire: 'on_onewire(_h: u32, _kind: u32, _pin: u32, _arg: u32) -> u32 { 1 }', i2s: 'on_i2s(_h: u32, _ch: u32, _sample: i32) {}', pulse: 'on_pulse(_h: u32, _pin: u32, _high: u32, _dur_us: f32) {}', twowire: 'on_twowire(_h: u32, _byte: u32) {}', digital: 'on_digital(_h: u32, _pin: u32, _high: u32, _cycles: u64) {}', analog: 'on_analog(_h: u32, _pin: u32, _volts: f32) {}', neopixel: 'on_neopixel(_h: u32, _count: u32) {}', none: 'on_pin(_h: u32, _pin: u32, _high: u32, _cycles: u64) {}' }[(protocol === 'none' ? 'spi' : protocol)] || 'on_pin(_h: u32, _pin: u32, _high: u32, _cycles: u64) {}';
    fs.writeFileSync(path.join(crateDir, 'src', 'lib.rs'), `// ${type} WASM core stub — C ABI, cycles only (never Date/clock).\n// Build: wasm-pack build core-rs --target web --out-dir ../core\nuse wasm_bindgen::prelude::*;\n#[wasm_bindgen(start)] pub fn _wasm_init_hook() {}\n#[no_mangle] pub extern "C" fn create() -> u32 { 0 }\n#[no_mangle] pub extern "C" fn destroy(_h: u32) {}\n#[no_mangle] pub extern "C" fn update(_h: u32, _cycles: u64) {}\n#[no_mangle] pub extern "C" fn ${rustBusFn} {}\n`);
    console.log('  + glue.ts + core-rs/ Rust stub');
}

console.log(`Scaffolded ${type} (${runtime}) in ${dir}`);
console.log('  manifest.json validates against component-schema.js');
console.log('Next: implement update() + art, then import in src/components/index.ts');
