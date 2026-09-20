// openhw-led glue.ts — component v2 WASM glue REFERENCE (separate file by design).
//
// Answers the user's question: YES, glue is separate from index.ts.
//   index.ts = declarative registry record (import-safe everywhere).
//   glue.ts  = imperative WASM loader (dynamic import, SAB mapping, ABI check).
//
// The LED is NOT a WASM candidate (JS overhead ~ns, boundary would dominate —
// see §4). This file is the shape reference every heavy port (MAX30102 →
// SSD1306 → ILI9341 → SD → radios) copies: same WasmCore interface, same ABI
// check, same fallback contract. No .wasm ships for the LED; load() resolves
// null so the runner uses the JS fallback in logic.ts.

import type { WasmCore, WasmGlueLoader } from '../WasmComponent';

export const WASM_ABI_VERSION = 1;

class NullCore implements WasmCore {
    readonly memory = new ArrayBuffer(0);
    update(_cycles: number): void {}
    readStateViews(): { f: Float32Array; i: Int32Array } | null {
        return null;
    }
}

export const ledGlueLoader: WasmGlueLoader = {
    async load(manifest: any): Promise<WasmCore | null> {
        // ABI gate: runner capability vs manifest.wasm.abi (§8.4).
        const wantAbi = Number(manifest?.wasm?.abi ?? WASM_ABI_VERSION);
        if (wantAbi !== WASM_ABI_VERSION) {
            console.warn(`[openhw-led glue] ABI mismatch (want ${wantAbi}, have ${WASM_ABI_VERSION}); using JS fallback.`);
            return null;
        }
        // LED has no .wasm by design — JS fallback always wins. Heavy ports
        // replace this body with: const mod = await import('./core.wasm?init')
        // (vite-plugin-wasm), instantiate with SAB importObject, return bound core.
        void NullCore;
        return null;
    },
};
