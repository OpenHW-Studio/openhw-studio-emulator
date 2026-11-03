/* tslint:disable */
/* eslint-disable */

export function _wasm_init_hook(): void;

/**
 * Inject an airwave-received payload. Applies the RX-state gate and
 * raises GDO0 — mirrors onRadioPacketReceived.
 */
export function cc1101_radio_rx(h: number, data: Uint8Array): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly _wasm_init_hook: () => void;
    readonly cc1101_create: () => number;
    readonly cc1101_cs: (a: number, b: number) => void;
    readonly cc1101_destroy: (a: number) => void;
    readonly cc1101_radio_rx: (a: number, b: number, c: number) => void;
    readonly cc1101_spi: (a: number, b: number) => number;
    readonly cc1101_state_len: () => number;
    readonly cc1101_state_ptr: (a: number) => number;
    readonly cc1101_tx_consumed: (a: number) => void;
    readonly cc1101_tx_ptr: (a: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
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
