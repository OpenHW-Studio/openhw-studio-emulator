/* tslint:disable */
/* eslint-disable */

/**
 * wasm-bindgen init hook — keeps the module importable via
 * `import init from './max30102_core.js'; await init(wasmUrl)` exactly like
 * the grading engine (same toolchain, same ?url pattern in glue.ts).
 */
export function _wasm_init_hook(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly _wasm_init_hook: () => void;
    readonly max30102_create: () => number;
    readonly max30102_destroy: (a: number) => void;
    readonly max30102_on_i2c: (a: number, b: number, c: number) => number;
    readonly max30102_on_pin: (a: number, b: number, c: number, d: number) => void;
    readonly max30102_on_spi: (a: number, b: number) => number;
    readonly max30102_set_leds: (a: number, b: number, c: number) => void;
    readonly max30102_state_len: () => number;
    readonly max30102_state_ptr: (a: number) => number;
    readonly max30102_update: (a: number, b: number) => void;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
