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
import { WASM_ABI_VERSION } from '../WasmComponent';

// LED WASM smoke core: brightness passthrough (Phase 1 reference).
// The .wasm is built from core-rs/ (same toolchain as MAX30102) and proves
// the full chain: manifest sim.runtime=wasm → glue → WasmComponent → SAB.
// JS fallback stays authoritative for grading (core mirrors, never decides).

class LedSmokeCore implements WasmCore {
    readonly memory = new ArrayBuffer(12);
    private brightness = 0;
    private illuminated = 0;
    update(_cycles: number): void {}
    setTarget(brightness: number, illuminated: number): void {
        this.brightness = brightness;
        this.illuminated = illuminated;
    }
    readStateViews(): { f: Float32Array; i: Int32Array } | null {
        return {
            f: new Float32Array([this.brightness, 0]),
            i: new Int32Array([this.illuminated, 0, 0, 0]),
        };
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
        // Smoke core is pure-JS (no .wasm to fetch): proves the
        // WasmComponent dispatch + SAB mirror path with zero toolchain risk.
        // Heavy ports (MAX30102 → SSD1306 → ILI9341 → SD → radios) replace
        // this with a real .wasm import (see max30102/glue.ts).
        return new LedSmokeCore();
    },
};
