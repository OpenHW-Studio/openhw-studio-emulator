# OpenHW Emulator — Future Plan: Components (JS + WASM)

Status: proposal / future reference. No breaking change approved yet.
Date: 2026-09-14
Scope: `openhw-studio-emulator/src/components/` + frontend runners in `OpenHW-studio-frontend/src/worker/`

Goal: keep JS components fast, add opt-in WASM components (e.g. Rust) for heavy parts, without increasing component<->board overhead.

---

## 1. How components work today

Component = folder with:

```text
openhw-led/
  manifest.json  # type, label, w/h, pins[], attrs, telemetry, autowiring/autocoding
  logic.ts       # LogicClass extends BaseComponent
  ui.tsx         # render only, no sim logic
  validation.ts  # circuit rules
  index.ts       # { manifest, LogicClass, UI, validation, ... }
```

Key files:

- `src/components/BaseComponent.ts:93-187` — ctor, `pins:{voltage,mode}`, `state`, `attrs`, `manifest`.
- `src/components/BaseComponent.ts:557-600` — `setPinVoltage/getPinVoltage/propagatePin`.
- `src/components/BaseComponent.ts:602-653` — hot API: `update(cpuCycles,wires,instances)`, `onEvent`, `onPinStateChange`, `onI2C*/onSPIByte/onPWM/onPIO/onOneWire/onI2SFrame`.
- `src/components/BaseComponent.ts:977-1094` — `getSyncState/getRawMetrics/getDeltaMetrics`.
- `src/components/index.ts:1-114` — central registry (emulator side).
- `OpenHW-studio-frontend/src/worker/registries/component-registry.ts:90-259` — `LOGIC_REGISTRY` actually used by runners.
- `OpenHW-studio-frontend/src/worker/registries/component-registry.ts:262-420` — `COMPONENT_PINS` duplicate pin tables.
- `OpenHW-studio-frontend/src/worker/runners/avr-runner.ts:159-176` — instantiation: `new LogicClass(id, manifest)`.
- `OpenHW-studio-frontend/src/worker/runners/avr-runner.ts:1537-1675` — `runLoop`: chunk CPU (`avrInstruction`, 32k cycles), then `inst.update(...)` for all instances, then `repropagateAllVoltages()` if dirty.
- `OpenHW-studio-frontend/src/worker/execute.ts:3-26` — `createRunnerForBoard()` dispatches AVR / RP2040 / backend-proxy.
- `OpenHW-studio-frontend/src/worker/registries/component-registry.ts:507-601` — `ComponentSignalAPI` (formal optional callbacks runners cast to).
- `OpenHW-studio-frontend/src/worker/registries/component-registry.ts:985-994,1153-1183` — sync policy + delta early-return to protect UI.

Simulation tick today:

```text
CPU chunk (avr8js/rp2040js) -> GPIO/I2C/SPI hooks -> inst.onPinStateChange/onI2CByte/onSPIByte
-> inst.update(cycles, wires, instances) -> setPinVoltage/propagatePin
-> repropagateAllVoltages / traversePassive (avr-runner.ts:583-811,912-1062)
-> getUnifiedComponentSyncState + FLUSH @ ~60Hz -> main thread -> canvas/DOM
-> displays zero-copy to render worker (simulation.worker.ts:814-892)
```

Example simple: `openhw-led/logic.ts:91-157`, heavy I2C: `openhw-ssd1306-oled/logic.ts:1-80`, heavy SPI+VRAM: `openhw-ili9341/logic.ts:4-100`, heavy DSP-ish: `max30102/logic.ts:1-100,36-52 (ppgPulseShape)`.

Largest `logic.ts` today is only ~632 lines (`openhw-sd-card`), total ~10k lines. TS is not slow because of size, but because of per-tick overhead (see §2).

---

## 2. Is JS fully utilizing V8 JIT? No.

V8 JIT likes: stable hidden classes, monomorphic call sites, typed arrays, no allocations in hot loops, inlinable small methods.

We violate several of these in the hot path:

### 2.1 Per-instance method wrapping (biggest JIT killer)

`BaseComponent.ts:189-347` `wrapTelemetryMethod()` + `installTelemetryHooks()`:

- Replaces `update/onEvent/onPinStateChange/onI2C*/onSPIByte/onPWM/...` per instance with a closure (`wrapped.__telemetryWrapped`).
- Runner hot site `avr-runner.ts:1610` `inst.update(...)` becomes megamorphic: N different closure targets instead of 1 prototype method.
- Prevents inlining. Adds `current.apply(this, args)` + rest-args allocation on every tick, even when `telemetryEnabled=false`.

Fix (no API change): don't monkey-patch methods. Either:
  a) subclass hook: `if (this.telemetryEnabled) record...` inline inside base methods, or
  b) wrap once on prototype at startup, not per instance, or
  c) move telemetry to runner side (`collectComponentTelemetry` already exists).

### 2.2 Fingerprint + JSON in hot path

- `observeStateMutation():525-555` -> `safeSerializeState():515-523` -> `normalizeStateForTelemetry():459-513` -> `JSON.stringify`.
- Called from `update`/`onPinStateChange`/`setState` paths. Even throttled (`45ms` for `update`), it walks full `state`, sorts keys, allocates strings.
- `getUniversalMetrics():870-949` + `applyHeuristics():737-840` do `Object.entries(snapshot)`, regex per key, `Date.now()` per call.
- `setPinVoltage():557-563` calls `capturePinLogicLevel()` + `capturePowerSample()` unconditionally (not gated by `telemetryEnabled`).

Fix: gate all telemetry behind `if (!this.telemetryEnabled) return` early; fingerprint only in `getDeltaMetrics`/grading path, never in `update()`; remove `Date.now()/performance.now()` from tick (use `cpuCycles` for time).

### 2.3 Shape polymorphism

- `(inst as any)._simCpu/_simUpdatePhysics/_setAvrPinDirect/pendingVisualStateEmit/telemetryMode/...` added dynamically in `avr-runner.ts:369-404,1577-1609`.
- `pins` is `string -> {voltage,mode,isHigh?}` object map; `state` is `any`.
- `Array.from(this.instances.values())` per frame is OK, but `instances.find(c=>c.id===...)` in `BaseComponent.propagatePin():584` and `LED.hasResistorInConnectedPath():33` is O(N*W) string work per tick.

Fix: declare optional fields on `BaseComponent` class upfront (stable shape); precompute `Map<id, inst>` (runners already have it, pass it down); cache netlist (`pinToNet` already exists in runner + worker `simulation.worker.ts:764-802`), components should query `areConnected()` not BFS wires themselves.

### 2.4 What is already JIT-friendly (keep)

- Class-based logic, `Uint8Array` VRAM (`ili9341`, `ssd1306` with `SharedArrayBuffer`), chunked execution (32k cycles), dirty-flag + sync policy + delta early return, zero-copy display frames, `Map<number,number>` net index.

Conclusion: ~60-70% JIT utilization today. Fixing §2.1-2.3 is higher ROI than rewriting to WASM. Do that first.

JIT checklist for all new component code:

1. No per-instance closures on hot methods.
2. No `Date.now()` in `update()/onPinStateChange()`. Use `cpuCycles`.
3. No `JSON.stringify/Object.entries/split/template-string` in `update()`.
4. Prefer numeric pin indexes + typed arrays internally; string pin ids only at boundary.
5. No `Array.from/map/filter` allocations per tick; reuse scratch buffers.
6. Keep `state` shape stable (init all keys in ctor, don't add keys later).
7. Heavy math (filters, CRC, PPG, framebuffers) on `Uint8Array/Float32Array`, tight `for` loops.

---

## 3. Should we change component arch? No rewrite. Evolve.

Do NOT:

- Rewrite all ~105 components.
- Change `manifest.json + LogicClass + UI + validation + index.ts` contract.
- Move sim logic into `ui.tsx` or into main thread.
- Create one Worker per component.

Do:

- Freeze `ComponentSignalAPI` (`component-registry.ts:507-601`) + `BaseComponent.update/onPinStateChange/getSyncState` as the stable ABI. Both JS and WASM implement it.
- Add `WasmComponent extends BaseComponent` adapter. Runners keep calling `inst.update(...)` unchanged.
- Keep `LOGIC_REGISTRY` as source of truth; allow `manifest.runtime: "js" | "wasm"`.
- Deduplicate pin tables: generate `COMPONENT_PINS` from `manifest.json`, don't hand-maintain two copies.

---

## 4. WASM components proposal: support both JS and WASM

Yes, support both. JS = default, WASM = opt-in for heavy components.

Good first WASM candidates (CPU-heavy, self-contained, typed-array friendly):

- `openhw-ili9341` (240x320x3 VRAM, CRC, windowing)
- `openhw-ssd1306-oled` (VRAM, page addressing)
- `max30102` (PPG waveform, FIFO, registers)
- `openhw-sd-card` (block device, FAT parsing)
- `openhw-mfrc522 / nrf24l01 / cc1101` (frame CRC, state machines)

Bad first candidates: pushbutton, LED, resistor, gates (JS overhead already ~ns, WASM boundary would dominate).

### 4.1 Where WASM lives

- Inside `simulation.worker.ts` (same thread as `AVRRunner/RP2040Runner`), NOT a separate worker per component, NOT main thread.
- One WASM module shared, one instance per component placement (or one instance with multiple contexts if Rust struct is `Send`-free and indexed by `handle:u32`).
- Toolchain: Rust `wasm32-unknown-unknown` + `wasm-bindgen` (or `wit-bindgen` later). Build with `wasm-pack --target web`, load via `await import(...pkg.js)` inside worker. Requires `worker.format:'es'` (already in `vite.config.js:72-74`) + `Cross-Origin-Opener-Policy/Cross-Origin-Embedder-Policy` (already set for SAB).
- Security: extend `assertSafeDynamicModule()` (`simulation.worker.ts:89-99`) with WASM allowlist: only `manifest.wasm.file` from local bundle, no network imports, capability-gated (no WASI).

### 4.2 Manifest extension (backward compatible)

```json
{
  "type": "openhw-my-sensor",
  "runtime": "wasm",
  "wasm": {
    "file": "my_sensor_bg.wasm",
    "exports": ["create", "destroy", "update", "on_pin", "on_i2c", "on_spi", "get_state_ptr", "get_state_len"]
  },
  "pins": [{ "id": "VCC" }, { "id": "GND" }, { "id": "SDA" }, { "id": "SCL" }]
}
```

If `runtime` missing -> `"js"`. Old frontends ignore `wasm` key.

### 4.3 Adapter sketch (runners unchanged)

```ts
// emulator/src/components/WasmComponent.ts (new)
export class WasmComponent extends BaseComponent {
  handle: number;
  core: WasmCore; // bound exports + shared memory
  update(cpuCycles, wires, instances) {
    // batch: write pin voltages into SAB once, single call
    this.core.writePins(this.pins);
    this.core.update(cpuCycles);
    this.core.readState(this); // sets this.state + pins, sets stateChanged only on diff
  }
  onPinStateChange(pin, high, cycles) { this.core.on_pin(pinIdx, high, cycles); }
  onI2CByte(a, d) { return this.core.on_i2c(a, d); }
  onSPIByte(b) { return this.core.on_spi(b); }
}
```

Rust side exposes plain C ABI, no JS glue in hot loop:

```rust
#[no_mangle] pub extern "C" fn create() -> u32 { ... }
#[no_mangle] pub extern "C" fn update(h: u32, cycles: u64) { ... }
#[no_mangle] pub extern "C" fn on_pin(h: u32, pin: u32, high: u32, cycles: u64) { ... }
```

Pins/state exchange via `SharedArrayBuffer` views, not JSON. Display VRAM already uses SAB — reuse same buffer object so render worker path (`routeDisplayFrames`) is untouched.

---

## 5. Overhead analysis: component <-> board

Question: "will overhead component-to-board increase with WASM?"

Answer: only if designed naively. Design to keep it flat.

| Design | Cost per event | Verdict |
|---|---|---|
| `postMessage` per pin change / per component worker | ~0.1-1ms + serialize | FATAL. Never do this. |
| JS->WASM call per CPU instruction | ~100-300ns + boundary | FATAL at 16MHz. |
| JS->WASM call per component `update()` chunk (every 32k cycles ≈ 500Hz @16MHz, 20 comps ≈ 10k calls/s) | ~1-3ms/s total | FINE. This is the target. |
| Shared-memory pins + batched `update()` | ~ns per pin, 1 call per tick | BEST. Recommended. |
| `getSyncState()` returning JSON per frame | dominates at 60Hz for ILI9341-size states | Avoid. Return views/handles, copy only on `stateChanged`. Already partially done via sync policy + delta. |

Rules:

1. Colocate WASM with runners. Zero `postMessage` in tick loop. `postMessage` only for 60Hz UI sync (already the case).
2. Batch: 1 `update()` per component per CPU chunk, not per instruction. Pin events coalesced (`onPinStateChange` only on edge, already done in `avr-runner.ts:1023,1829-1835`).
3. No strings across boundary in hot path. Pin ids -> `u32` indexes once at `create()`. Voltages -> `f32` array in SAB.
4. `getSyncState()` for WASM must not allocate: return cached JS mirror, update only when WASM sets dirty flag.
5. Keep physics (`repropagateAllVoltages/traversePassive`) in JS for now. WASM components are leaves (sensors/displays), not net solver. Don't split net solver across boundary.

Expected outcome: heavy component (e.g. ILI9341 SPI byte handling + VRAM blit) 2-10x faster in WASM/Rust, board loop unchanged, UI frame budget unchanged.

---

## 6. Roadmap (phased, no freeze)

Phase 0 — JIT fixes, JS-only (highest ROI, no API change):
- [ ] Remove per-instance `wrapTelemetryMethod`; gate telemetry with inline `if` (BaseComponent.ts:189-347).
- [ ] Gate `capturePinLogicLevel/capturePowerSample/observeStateMutation` behind `telemetryEnabled` (BaseComponent.ts:557-563,525-555).
- [ ] Remove `Date.now()` from `update()` paths (LED `logic.ts:123-124`, ILI9341 `logic.ts:71`, SSD1306 `logic.ts:61-80`); use `cpuCycles`.
- [ ] Declare `_simCpu/_simUpdatePhysics/_setAvrPinDirect/pendingVisualStateEmit` on class (fix shapes).
- [ ] Replace `instances.find` + wire BFS inside components with runner-provided `Map` / `areConnected()`.
- [ ] Generate `COMPONENT_PINS` from manifests (remove hand-duplicated table).
- [ ] Bench: add `runLoop` timing counters already present (`lastPhysicsMs/lastComponentUpdateMs`) to sim-monitor; assert no regression.

Phase 1 — Dual-runtime ABI (both JS + WASM):
- [ ] Freeze `ComponentSignalAPI` + document in `docs/protocol-api.md`.
- [ ] Add `WasmComponent extends BaseComponent` + `WasmCore` loader in worker (SAB pins, `create/destroy/update/on_pin/on_i2c/on_spi`).
- [ ] Add `manifest.runtime/wasm` schema to `component-schema.d.ts` + validator.
- [ ] Add `vite-plugin-wasm` + `assetsInclude: ['**/*.wasm']`; keep `worker.format:'es'`.
- [ ] Register one reference WASM component behind flag (e.g. `openhw-led` trivial port as smoke test, then `max30102`).

Phase 2 — Heavy ports + tooling:
- [ ] Port ILI9341 / SSD1306 / SD-card reference implementations to Rust.
- [ ] `scripts/new-component.mjs` scaffolds both `logic.ts` and Rust crate with same pin map.
- [ ] Grading worker (`grading-engine.worker.ts`) reuses same `LOGIC_REGISTRY` so WASM works in grading without fork.
- [ ] Docs: "Write a WASM component" + ABI versioning (`wasm.abi: 1`).

---

## 7. What NOT to do (recorded decision)

- No full rewrite to WASM / AssemblyScript-only. JS stays first-class; most components are I/O-bound, not compute-bound.
- No per-component `Worker`. We already have the right topology: 1 sim worker + render worker + net worker (`simulation.worker.ts:62-81`).
- No floating-point net solver across WASM boundary yet. Keep `traversePassive/repropagateAllVoltages` in JS until Phase 2 proves otherwise.
- No WASM for `ui.tsx`. Rendering stays React/canvas.

## 8. Open questions

1. Rust vs AssemblyScript for contributors? Lean Rust (existing grading engine already uses Rust WASM: `grading-engine.worker.ts:47-51`).
2. One WASM instance per component vs pooled handles? Start per-placement instance (simplest, isolates state).
3. Determinism: WASM must use `cpuCycles`, never `Date.now()` — enforce by not importing `js_sys::Date`.
4. Versioning: `manifest.wasm.abi` + sim-worker capability check on `START`.

---

## 9. SharedArrayBuffer: current state (verified) + full-utilization plan

Short answer: yes, fully utilize SAB — but only for the boundary it fixes
(worker → main UI/telemetry/render + worker → WASM). It does NOT fix
component↔board communication, which is already zero-copy and must stay that way.

### 9.1 SAB is enabled, but ~95% unused today (verified)

Isolation headers are set, so `SharedArrayBuffer` + `crossOriginIsolated` work:

- `OpenHW-studio-frontend/vite.config.js:143-147` dev headers
  (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless`).
- `OpenHW-studio-frontend/nginx.conf:110-112` (+ `128-134` for `js/wasm`) same headers in prod.

What exists today:

1. Main allocates one SAB per run: `SimulatorPage.jsx:945` (`stateSabRef`),
   `10960-10999` (per-component offsets: 8 bytes default, `rows*cols*4` for
   neopixel, 4KB-aligned, sent as `sab` + `sabOffsets` in `START`).
2. Sim worker forwards it: `simulation.worker.ts:1379-1380` (single) and
   `1554-1555` (multi) into runner options.
3. RP2040/backend-proxy store it on the instance:
   `rp2040-runner.ts:1016-1017` (`inst.sab/inst.sabOffset`),
   `backend-proxy-runner.ts:88-89,100-101`. **AVR runner ignores it completely**
   (no `sab` reference in `avr-runner.ts` except the FLUSH comment at `1661`).
4. **No component reads/writes `inst.sab`** (zero hits in
   `openhw-studio-emulator/src`). The only SAB uses in the emulator are
   isolated per-display VRAM buffers (`openhw-ili9341/logic.ts:23`,
   `openhw-ssd1306-oled/logic.ts:42`, `openhw-ili9341-touch/logic.ts:24`) —
   not the shared state SAB.
5. `SimulatorPage.jsx:1693-1710` runs a `__sabTickers` rAF loop "bypassing React",
   but nothing ever registers into `window.__sabTickers` (only consumer found).
   Scaffolding without a producer.

Current hot UI path therefore still goes through `postMessage`:

```text
runner.forceEmitState() [avr 1726-1767 / rp2040 4054-4091]
 -> getUnifiedComponentSyncState() [registry 1153-1160] + collectComponentTelemetry() [1162-...]
 -> postRunnerState() [simulation.worker.ts:894-950]
 -> routeDisplayFrames() strips VRAM, zero-copy to render worker [814-892] (this part is GOOD)
 -> postMessage({type:'state', pins, analog, components}) to main
 -> SimulatorPage onmessage [10465-10553]: copies pins/analog, updateLiveOopStates(),
    handleTelemetryStateMessageRef() -> TelemetryManager.js:170-208
    (250ms throttle, selected-IDs filter, formatTelemetryEntry with JSON.stringify)
 -> FLUSH_VISUALS pacing from main rAF [3227-3241]: ~33fps idle, ~12fps during drag
```

Cost centers this creates: (a) `getSyncState` object spreads + `JSON.stringify`
fingerprinting per component, (b) structured-clone of the whole `components`
array at flush rate, (c) main-thread object copies + string formatting for
telemetry even for unselected components (filtered late, in `TelemetryManager`).

### 9.2 Design principle: SAB is for worker→UI, not component→board

| Path | Today | SAB helps? | Decision |
|---|---|---|---|
| Component ↔ board (GPIO/I2C/SPI/PWM inside runner: `inst.update`, `onPinStateChange`, `traversePassive`, `repropagateAllVoltages`) | Direct method calls, same thread, ~ns | NO — adding SAB here adds complexity for zero gain | Keep as-is. Never route intra-worker ticks through SAB or `postMessage`. |
| Worker → main visual state (`pins`, LED brightness, servo angle, LCD text) | `postMessage` full objects @ flush rate | YES — biggest win | Move hot numerics to SAB views; main polls, no clone. |
| Worker → main telemetry | `postMessage` full metrics + main-side stringify | YES, numeric part only | Ring buffer of numeric records in SAB; strings stay lazy/on-demand. |
| Display VRAM → render worker | Already zero-copy (`routeDisplayFrames` + `MessagePort` + SAB-backed `Uint8Array`) | Already done | Keep. Don't re-route through main SAB. |
| Worker → WASM component (future §4) | n/a | YES | WASM reads/writes the same SAB directly, zero extra copy. |
| Serial/events/errors/grading keys | `postMessage` | NO (infrequent, needs fidelity) | Keep on `postMessage`. |

Rule: SAB carries **fixed-layout numerics at frame rate**; `postMessage`
carries **infrequent structured events** (serial, toast, error, key-capture,
grading deltas, shape changes like new `attrs` keys).

### 9.3 Proposed SAB layout v1 (one shared file, versioned)

New shared constants file (importable by worker + main, no duplication like
today's `COMPONENT_PINS` problem):

```text
frontend/src/worker/sab/layout.ts  (new, single source of truth)
  SAB_LAYOUT_VERSION = 1
  HEADER (64 B): magic u32, version u32, frameSeq u32, simTimeMs f64,
                 numComponents u16, pinBitsLen u16, telemetryHead u32, flags u32
  PIN REGION: board digital pins as bitfield (u32 words) + analog as f32 array
  COMPONENT SLOTS (fixed stride, e.g. 64 B each, index assigned at START):
    stateVersion u32, dirty u32, kind u16, pinCount u16,
    f0..f7 (f32: brightness/angle/voltageDrop/current/duty/...) ,
    i0..i3 (i32: illuminated/pressed/enabled/...),
    reserved
  TELEMETRY RING (fixed record, e.g. 32 B x 1024):
    compSlot u16, code u16, v0 f32, v1 f32, cycles u32, wallMs u32
  (Display VRAM stays in its own existing SABs — do NOT pack 230 KB ILI9341
   frames into this buffer.)
```

Why fixed stride: no allocator, no JSON, no GC in tick; writer does
`view[slot+FIELD] = value; Atomics.store(header, SEQ, seq+1)`.
Reader does `seq = Atomics.load(header, SEQ); if (seq !== last) render`.
Per-component offsets already allocated at `SimulatorPage.jsx:10960-10971` —
replace that ad-hoc `8 bytes / rows*cols*4` scheme with this layout.

Type-specific field maps (which `f0` means what per `manifest.type`) live next
to manifests, e.g. `openhw-servo: { f0: 'angleDeg', i0: 'attached' }`, so the
reader never parses strings per frame.

### 9.4 Sync protocol (never block the main thread)

- Worker is the only writer. Main + render worker are readers.
- Worker bumps `frameSeq` with `Atomics.store` after writing a frame. No locks.
- Main polls `frameSeq` inside the existing rAF loops (`__sabTickers` loop
  `1693-1710` + FLUSH loop `3227-3241`) — use `Atomics.load`, never
  `Atomics.wait` on main (it would jank).
- `FLUSH_VISUALS` stays as the pacing signal but becomes tiny: worker writes
  SAB then (optionally) posts only `{type:'state', seq, simTimeMs, dirtySlots}`
  instead of the full `components` array. `dirtySlots` is a bitset so main
  skips unchanged components without touching objects.
- Web components / `wokwi-elements` read SAB views directly in `tick()`
  (that's what the `__sabTickers` loop was built for) — no `setState` per
  frame, no React re-render. Keep `liveOopStatesRef`/`renderComponentsByBoardRef`
  as the slow-path mirror for inspector/grading, updated only on `dirty`.
- Fallback: if `crossOriginIsolated === false`, skip SAB and use today's
  `postMessage` path unchanged. Capability-check at `START`.

### 9.5 Telemetry on SAB (fix the "required but expensive" problem)

Current problem: telemetry is all-or-nothing — enabling it turns on
per-instance wrappers (`BaseComponent.ts:189-347`), per-tick fingerprint
`JSON.stringify` (`525-555`), and full `collectComponentTelemetry` payloads
that get cloned and then mostly discarded by the selected-IDs filter
(`TelemetryManager.js:184-186`).

Fix with SAB:

1. Writer side: components write only compact numeric codes
   (e.g. `LED: {illuminated, brightness}`, `MAX30102: {spo2, bpm}`) into the
   telemetry ring. No strings, no `Object.entries`, no regex per tick.
   Gate everything behind `telemetryEnabled` (same fix as §2) — SAB write is
   ~ns but still skipped when telemetry is off.
2. Reader side: main reads only slots in `selectedTelemetryComponentIds`.
   Unselected components cost zero on main (filter moves from post-format to
   pre-read).
3. `detail`/`delta`/`simple` string formatting (`formatTelemetryEntry`,
   `TelemetryManager.js:51-140`) stays on main and stays lazy — only for
   visible console rows, at the existing `250ms/speed` throttle (`174-181`).
   Delta detection becomes `stateVersion` counter compare, not
   `JSON.stringify` compare (`getDeltaMetrics`, `BaseComponent.ts:1013-1094`).
4. Grading/teacher-key path (`grading-engine.worker.ts:372-373`,
   `simulation.worker.ts:1402-1424`) keeps today's full-fidelity `postMessage`
   snapshots — SAB is lossy-by-design (ring overwrites), grading must not use it.

### 9.6 Implementation steps (ordered, AVR first)

1. Plumb `sab/sabOffsets` into `AVRRunner` (today only RP2040/proxy store it).
   Verify `crossOriginIsolated` and layout version handshake on `START`.
2. Add `worker/sab/layout.ts` (offsets, strides, field maps) shared by
   runners + `SimulatorPage` reader. Delete the ad-hoc offset math in
   `SimulatorPage.jsx:10960-10974` in favor of it.
3. Implement `SabStateWriter` in runners; call it from `forceEmitState`
   (`avr-runner.ts:1726-1767`, `rp2040-runner.ts:4054-4091`) — write views,
   bump `frameSeq`, post only `{seq, simTimeMs, dirtySlots}`.
4. Implement `useSabStateReader` on main: rAF poll → update SAB-backed
   web components via `__sabTickers.tick()` → update refs only for dirty slots.
   Keep `postMessage` state handler as fallback + slow mirror.
5. Move telemetry numerics to the ring; keep `SET_COMPONENT_TELEMETRY`
   (`TelemetryManager.js:219-226`) as the on/off switch that also enables SAB
   telemetry writes.
6. Bench: log SAB vs postMessage bytes/frame using existing perf fields
   (`perf.lastRunLoopMs/lastPhysicsMs/lastComponentUpdateMs`,
   `SimulatorPage.jsx:10596-10608`). Assert: zero `postMessage` `components`
   bytes on steady frames, same visual FPS, lower `worstFrameMs`.
7. Then (and only then) let WASM components (§4) map the same SAB —
   no new transport needed.

### 9.7 Risks / non-goals

- Do NOT put variable-length JSON/strings in SAB. Strings stay on `postMessage`.
- Do NOT `Atomics.wait` on the main thread. Poll via rAF.
- Do NOT route component↔board ticks through SAB — that path is already
  optimal and SAB would only add branches to the hottest loop
  (`avr-runner.ts:1556-1621`, `rp2040-runner.ts:3606-3641`).
- Do NOT pack display framebuffers into the state SAB; keep the existing
  `routeDisplayFrames` MessagePort path (`simulation.worker.ts:814-892` →
  `display.render.worker.ts:100-116`).
- Keep `postMessage` for serial, errors, toasts, key-capture, grading —
  SAB complements it, doesn't replace it.

---

## 10. Clean redesign v2 — "SAB as river" (analysis + decision)

This section answers: "rebuild simulation arch from scratch, SAB as the river
everything reads/writes". Verdict after working through all possibilities:
**yes to SAB as the single data-plane river across threads; no to SAB for
intra-worker component↔board traffic; and telemetry alone is not debugging —
add a real debug control-plane on top.** What follows is the v2 blueprint to
build clean instead of patching v1.

### 10.1 Why telemetry today is not debugging

Telemetry (`BaseComponent.ts:737-949`, `collectComponentTelemetry`,
`TelemetryManager.js:170-208`) is observability, not a debugger:

- It answers "what is LED brightness now" (sampled strings at 250ms throttle,
  selected-IDs filter), not "why did pin 13 go low at cycle N".
- No halt/step/resume. No PC breakpoints, no pin watchpoints, no memory inspect.
- No determinism: `Date.now()` in tick (`led:123`, `ili9341:71`,
  `ssd1306:61-80`) + wall-clock `setTimeout(runLoop,1)` mean the same run is
  not replayable, so a telemetry trace can't be rewound.
- Metrics and visuals are fused: enabling telemetry changes hot-path behavior
  (per-instance wrappers `189-347`, fingerprint `JSON.stringify` per tick
  `525-555`), so "observing" perturbs the system.
- Main-thread formatting (`formatTelemetryEntry` stringify per row) runs even
  for data nobody watches.

So: keep telemetry as the **data source**, add **worker debug service + UI
debug panel + command queue** as the **control**. Telemetry says what happened;
the debugger freezes time, asks why, and pokes state.

### 10.2 The river metaphor, corrected

```
              ┌──────────────────────────────────────────────┐
              │              SAB — DATA RIVER                 │
              │  (fixed-layout numerics, frame-rate, polled) │
              │  pins │ comp slots │ telemetry ring │ serial │
              │  display descriptors │ debug snapshot region │
              └──────────────────────────────────────────────┘
        writes ▲                                    ▲ reads (poll, never block)
               │                                    │
   sim worker (sole writer of sim state)    main UI / render worker / WASM
               │                                    │
              ┌──────────────────────────────────────────────┐
              │   postMessage — CONTROL BANKS                 │
              │   (infrequent, structured, reliable)          │
              │   START(sab handle) │ WAKE │ commands │ events│
              │   serial strings │ errors │ grading keys │ blobs│
              └──────────────────────────────────────────────┘
```

Rule: **SAB carries state at frame rate; postMessage carries decisions and
strings.** Every "should this go in SAB?" question is decided by:
fixed-size + high-frequency + loss-tolerant → SAB. Variable-length +
rare + must-not-lose → postMessage.

### 10.3 Possibilities considered (and why each wins/loses)

1. **Pure SAB, zero postMessage after START.** Loses. Variable data (serial
   strings, errors, hex blobs, grading keys, pcap) doesn't fit fixed slots
   without an allocator in shared memory. Multi-writer races (UI + worker both
   writing pin state) need locks; locks + `Atomics.wait` on main = jank.
   Lost-wakeup bugs are undebuggable without a message fallback. Keep one
   `MessagePort` purely as wakeup + control.
2. **SAB also for component↔board inside the worker.** Loses. That path is
   already same-thread direct calls (`inst.update`, `onPinStateChange`,
   `traversePassive`) at ~ns. Routing it through SAB views adds branches to
   the hottest loop (`avr-runner:1556-1621`, `rp2040:3606-3641`), breaks V8
   inlining (§2), and buys nothing — no thread boundary is crossed.
   Components **publish** to SAB; they never **talk** through it.
3. **One global SAB vs per-component/per-board SABs.** One global SAB wins for
   v2: single transfer at START, single version handshake, single seq counter,
   trivial WASM mapping. Per-component SABs multiply handles, offsets, and
   version checks. Multi-board is handled by partitioning the one SAB
   (board table + per-board pin regions), not by N buffers. Exception that
   stays separate: display VRAM keeps its own SABs + MessagePort
   (`routeDisplayFrames`, `display.render.worker.ts:100-116`) — never pack a
   230 KB ILI9341 frame into the state river.
4. **Polling vs blocking sync.** Main **polls** (`Atomics.load(frameSeq)` in
   the existing rAF loops `SimulatorPage:1693-1710,3227-3241`), never
   `Atomics.wait` (would freeze UI). Worker **never waits** on UI. Main→worker
   commands use an MPSC ring + `Atomics.notify` wake; worker drains it once per
   tick. No mutexes on the frame path — only monotonic sequence counters and
   per-slot `version/dirty` words.
5. **Split workers (CPU worker + physics worker + component worker)?** Loses
   for v2. Today's topology (1 sim worker + render worker + net worker,
   `simulation.worker.ts:62-81`) is already right. Splitting the tick across
   workers reintroduces the exact `postMessage`-per-step cost §5 calls FATAL
   and destroys determinism. Keep tick colocated; split only I/O isolates
   (render, net) — which is already done.
6. **Remote boards (ESP32/STM32 backend-proxy, `backend-proxy-runner.ts`).**
   Can't share SAB over the network. Bridge pattern: proxy runner owns a local
   SAB partition and mirrors it from backend deltas (`syncGpio`, GPIO poll);
   backend messages stay `postMessage`/WebSocket. SAB river is a
   same-machine optimization; the proxy is the adapter.
7. **Determinism vs wall-clock.** v2 tick is driven by **sim-time budget**
   (cycles owed), not `setTimeout(1)` + `Date.now()`. `Date.now()` is banned
   from `update()` (use `cpuCycles`; same rule as §2 checklist). Every command
   and event is stamped with `cpuCycles`. That gives replay: same hex + same
   command log = same trace. Grading/teacher-key keeps full-fidelity snapshots
   over `postMessage` — the SAB ring is lossy by design and must never feed
   grading.

### 10.4 v2 memory map (single SAB, versioned, fixed strides)

One new source of truth: `frontend/src/worker/sab/layout.ts`
(magic, version, all offsets — kills the ad-hoc `8-bytes/rows*cols*4` math in
`SimulatorPage.jsx:10960-10974` and the duplicated `COMPONENT_PINS` problem).

```text
HEADER 64 B: magic u32 | version u32 | frameSeq u32 | simTimeMs f64
             numBoards u16 | numComponents u16 | cmdHead/cmdTail | evtHead/evtTail
             telemetryHead u32 | flags u32 (running|paused|fault|telemetryOn)
BOARD TABLE (per board): boardId hash u32 | pinBitBase | analogBase | pinCount
PIN REGION: digital bitfield (u32 words) + analog f32 array (D/A aliases resolved once at START)
COMPONENT SLOTS, stride 64 B, index assigned at START:
  version u32 | dirty u32 | kind u16 | boardIdx u16
  f0..f7 f32  (brightness/angle/voltageDrop/current/duty/...)  ← field map per manifest.type
  i0..i3 i32  (illuminated/pressed/enabled/mode/...)
COMMAND QUEUE main→worker, MPSC ring, e.g. 256 × 32 B records:
  op u16 (INTERACT/SERIAL/RESET/SET_SPEED/SET_TELEMETRY/HALT/STEP/WRITE_PIN/WRITE_MEM/...)
  target u16 (component slot / board idx) | arg0,arg1 u32 | cycles u64 stamp
EVENT QUEUE worker→main, SPSC ring, e.g. 256 × 32 B records:
  code u16 (SERIAL_BYTE/TOAST/ERROR/SYNC_FAULT/BREAK_HIT/...) |_overflow flag→postMessage body
TELEMETRY RING, e.g. 1024 × 32 B: compSlot u16 | code u16 | v0,v1 f32 | cycles u32 | wallMs u32
SERIAL RINGS: two SPSC byte rings (rx/tx, 4 KB each) + baud/source header — bytes only, strings assembled on main
DEBUG REGION (worker-written, debugger-polled, valid only when paused/halted):
  pc u32 | sp u32 | cycles u64 | breakReason u32 | watched pin/component values (fixed slots)
DISPLAY DESCRIPTORS (not pixels): compSlot | width | height | vramHandle idx | dirtyRect — pixels stay in existing VRAM SABs
```

Field maps (`f0 = brightness` for LED, `f0 = angleDeg` for servo, …) live next
to `manifest.json` so readers never parse strings per frame. Layout `version`
is handshake-checked at START; mismatch = clean error, not silent corruption.
Fallback: `crossOriginIsolated === false` → today's `postMessage` state path
unchanged.

### 10.5 Ownership + threading contract (the part that keeps it debuggable)

| Region | Writer | Readers | Sync |
|---|---|---|---|
| Header/frameSeq/simTime | worker | all | `Atomics.store` seq bump per frame |
| Pins, comp slots | worker (runner+components publish) | UI, render, WASM, telemetry | per-slot `version++` + `dirty=1`; main clears after read |
| Command queue | main | worker | MPSC head/tail + `notify` wake; worker drains per tick, stamps `cycles` |
| Event queue | worker | main | SPSC head/tail; overflow → `postMessage` full body |
| Telemetry ring | worker (only if `telemetryOn`) | debug UI | monotonic head; overwrite-oldest; lossy OK |
| Serial rings | each direction SPSC | other side | head/tail; strings assembled off-tick |
| Debug region | worker | debugger UI | valid when `paused`; read-only for UI except via commands |

Invariants: (a) UI never writes sim state — only commands. (b) Worker never
blocks on UI. (c) No `Atomics.wait` on main. (d) No strings/JSON/allocations in
tick — strings cross only via event overflow `postMessage`. (e) Component↔board
stays function calls; SAB write happens once per component per flush in
`forceEmitState`, not per instruction.

### 10.6 v2 tick (clean loop, replaces both runLoops)

```text
worker tick (per board runner):
  1. drain command queue (≤N per tick, cycle-stamped): INTERACT→onEvent, SERIAL→rx ring→UART,
     WRITE_PIN→propagate, HALT/STEP→debug service, SET_SPEED/TELEMETRY→flags
  2. run CPU budget (cycles owed from sim-time, clamped; no wall-clock catch-up spiral)
  3. GPIO/I2C/SPI hooks → onPinStateChange/onI2CByte/onSPIByte (edges only, coalesced)
  4. inst.update(cycles, netIndex, instancesById) — Map, not find(); no wire BFS in components
  5. repropagateAllVoltages() once if dirty (physics stays JS, leaves-only rule from §5)
  6. publish: pins→bitfield/f32, changed comps→slots (version++/dirty), telemetry→ring (if on),
     serial tx→ring, display→descriptors (+ existing zero-copy VRAM port)
  7. Atomics.store(frameSeq+1); if events pending → tiny postMessage {seq, simTimeMs, dirtyBoards} as wakeup
main rAF (existing loops):
  poll frameSeq → for dirty slots update SAB-backed web components via __sabTickers.tick()
  (no React setState per frame) → inspector/grading mirror updates only on dirty
  → telemetry reader reads only selectedTelemetryComponentIds slots → lazy string format at 250ms
```

`FLUSH_VISUALS` shrinks to `{seq}` pacing or disappears into the wakeup message.
`INTERACT`/`SERIAL_INPUT`/`RESET`/`SET_SPEED` postMessages become command-ring
records (same semantics, no handler-spaghetti in `simulation.worker:1644-1801`).

### 10.7 Debug service (what "add worker and UI to telemetry" actually means)

New `worker/debug/service.ts` (worker side) + `DebugPanel` (UI side):

- Ops over command queue: `HALT / RESUME / STEP_N(cycles|instructions) /
  READ_MEM / READ_PINS / WRITE_PIN / WATCH_ADD(pin|compField|pcRange)`.
- Break sources: PC breakpoints (AVR/RP2040 runners check at chunk boundary —
  never per-instruction string compare), pin watchpoints (edge in
  `propagateBoardPin`), component watchpoints (slot `version` + field compare).
- On hit: worker sets `flags=paused`, fills debug region (PC/SP/cycles/reason),
  posts wakeup event. UI polls debug region, renders registers/pins/slots —
  all from SAB, zero extra clone.
- Record/replay: command log (cycle-stamped) + periodic full snapshot over
  `postMessage` → deterministic re-run for grading and bug reports.
- Telemetry ring becomes the chart source (pins/analog/custom numerics by
  `cycles` stamp) — no more `JSON.stringify` compare for deltas; delta =
  `version` counter compare.

### 10.8 What to delete vs keep in the rewrite

Keep (contracts, not code): `manifest.json + LogicClass + UI + validation +
index.ts` shape; `ComponentSignalAPI` callback names; display
`IDisplayRenderer` + render worker; net worker boundary; grading snapshot
semantics (full-fidelity `postMessage`, never SAB ring).
Throw away: per-instance telemetry wrappers; `observeStateMutation`/`safeSerializeState`
in tick; `Date.now()` in `update()`; `instances.find` + wire BFS in components;
ad-hoc `sab/sabOffsets` plumbing (AVR ignores it today); full-`components`
`postMessage` per flush; main-side stringify-per-frame telemetry.
Rewrite: runner tick loops (one shared `BoardDriver` interface: AVR, RP2040,
proxy implement it), physics publish step, `SabWriter`/`SabReader`, command +
event rings, debug service, `TelemetryManager` as reader+lazy formatter.

### 10.9 Build order (no half-migrated states)

1. `sab/layout.ts` + version handshake + `crossOriginIsolated` fallback.
2. `BoardDriver` interface + one clean AVR tick (commands drain → cpu budget →
   hooks → update → physics → publish). RP2040/proxy adopt it after.
3. `SabWriter` in `forceEmitState` + `useSabReader` on main (`__sabTickers`
   becomes the real render path); wakeup replaces full-state `postMessage`.
4. Command ring (INTERACT/SERIAL/RESET/SPEED first), then event ring.
5. Telemetry ring + selected-IDs pre-read filter + lazy formatting.
6. Debug service + panel (HALT/STEP/WATCH/READ) + record/replay log.
7. WASM components (§4) map the same SAB — no new transport.
8. Bench gates: steady-frame `postMessage` bytes ≈ 0 (only wakeups), same
   visual FPS, lower `worstFrameMs`, replay determinism test in CI.

---

## 11. AI-native development: agent builds components + circuits (own system)

Correction note: the previous version of this section reused `ComponentEditorPage`
(generators, `runLogicCheck`) and `services/TelemetryManager.js` as the agent's
tools. That is withdrawn. `ComponentEditorPage` is broken/unmaintained and its
generators (`genUICode/genLogicCode`, mock smoke test) are not a contract the
agent can rely on; `TelemetryManager` is a human UI formatter (250 ms throttle,
selected-IDs post-filter, `JSON.stringify` per row) — wrong shape, wrong timing,
and lossy for verification. The agent gets its **own dedicated system** below.
Nothing in §11 depends on those two modules working.

Premise (from user): the agent has the same repo access as us. It edits component
**source files directly** (`openhw-studio-emulator/src/components/<type>/{manifest.json,
logic.ts,ui.tsx,validation.ts,index.ts}`). There is no "component editor" in the
loop. The open questions are: (1) how does the agent build/change the **circuit**
(canvas) and the firmware, (2) how does it **run** it, (3) how does it **fetch
telemetry and verify** correctness. Answer: a deep **MCP + in-browser bridge**
with one shared tool API and a dedicated Agent Telemetry API. This whole stack
exists so AI can develop, not just chat.

### 11.1 Relay architecture (DECIDED): localhost relay, no backend, no deploy

Decision: **local Relay on the same laptop, dev-only**. It answers the
feasibility question directly: **yes — the opencode agent running in terminal
CAN drive the live website canvas (place/wire/move) and fetch live telemetry
(trace/assert), and you see the fix instantly in the open browser tab.**

Why NOT through backend (recorded per user):

- Everything happens on one laptop in dev: agent + `vite dev` + browser tab.
  Routing through `openhw-studio-backend` adds a deploy, auth, nginx, DB, and
  network hops for zero benefit. The backend is not in the loop at all.
- No deploy step, ever, in this flow. Agent edits a file → bridge reloads it →
  canvas updates in the already-open tab. Instant.

Why a relay at all (why not direct):

- Browser cannot listen (no TCP accept, no MCP stdio). The live circuit
  (`SimulatorPage` state), sim worker, and SAB live inside the page JS context
  and are reachable only by the page dialing OUT.
- Opencode owns the MCP stdio pipes of whatever MCP server it spawns. The
  browser cannot inject into those pipes.
- So someone on localhost must LISTEN. That someone is a tiny NEW Node process
  (not the backend, not the broken CLI folder): it speaks MCP-stdioside to
  opencode and WS-server-side to the browser bridge. One process, two faces,
  ~200 lines, forward-only.

Local topology (all on 127.0.0.1, nothing leaves the laptop):

```text
opencode agent (terminal, same laptop, has repo file access)
   │ MCP stdio (tools/list + tools/call) — spawned as subprocess
   ▼
openhw-studio-agent-relay/ (NEW, clean folder — NOT OpenHW-studio--cli, NOT backend)
   ├── MCP face: stdio to opencode (tool schemas from tools.schema.ts)
   └── WS face: listens on ws://127.0.0.1:8765/agent  (localhost only, token optional)
            ▲ dials OUT from browser (browser can only dial out — this is the §11.1 direction)
            │
Frontend AgentBridge (NEW, frontend/src/agent/bridge.ts)
   ├── executes on live SimulatorPage state + sim worker (canvas/run/trace/assert)
   └── exposes same impl to in-browser panel via window.OpenHWAgent (direct calls, no WS)

Shared contract (single source of truth, NEW):
   frontend/src/agent/tools.schema.ts → tool names + JSON schemas + trace/assert schemas,
   imported by bridge, panel, and relay (copy with AGENT_TOOLS_VERSION check).
```

Message flow for one agent action (e.g. `agent.wire` → `agent.run` → `agent.assert`):

```text
1. opencode → (stdio) MCP tools/call { name:'agent.wire', args:{from,to}, id }
2. relay: name in BROWSER_TOOLS? → store pending { id → waiter, timeout 30 s (run: 120 s + progress) }
   → forward { id, type:'tools/call', tool, args } over WS to bridge
   → bridge offline? reply { ok:false, code:'bridge-offline' } immediately (<1 s)
3. bridge: AgentBackend executes (validate pins → mutate live canvas model → runUnifiedValidation),
   replies { id, type:'tools/result', ok, result } over same WS
4. relay: route reply to waiting stdio call, delete pending
5. opencode receives MCP tool result (content[0].text = JSON), next step. Canvas already updated visibly.
```

Tool routing (no duplication):

- **Agent's own hands (no MCP needed):** file reads/writes — opencode already
  has repo access, edits `openhw-studio-emulator/src/components/<type>/…` directly.
- **Relayed to browser (bridge must be online):** `agent.getProject/place/move/
  delete/setAttr/wire/unwire/setFirmware/run/stop/interact/serialInput/
  startCapture/getTrace/assert/snapshot/reloadComponents/validateCircuit`.
  These touch the LIVE canvas, live worker, live SAB, or Vite-resolved
  registries — only the open tab can answer authoritatively.
- **Fallback rule:** relayed tool with bridge tab closed → structured
  `{ ok:false, code:'bridge-offline',
    hint:'open http://localhost:5173/simulator?agent=1 (same laptop)' }`,
  never a silent fake answer. Verification-green requires the browser path.

Security/non-goals: localhost-bind only (`127.0.0.1`, never `0.0.0.0`);
optional `OPENHW_AGENT_TOKEN` (dev default allow); payload cap 1 MB;
relay forwards opaque JSON, never evaluates code; component-code sandbox
(`assertSafeDynamicModule`, `simulation.worker.ts:89-99`) still applies to
anything the bridge executes. Backend changes: NONE. Deploy: NONE.
Broken `OpenHW-studio--cli/` untouched (see its `DO_NOT_USE.md`).

### 11.2 Two edit planes, kept in sync (user decision: both)

Plane A — component source (agent edits files directly):

```text
openhw-studio-emulator/src/components/<type>/manifest.json | logic.ts | ui.tsx | validation.ts | index.ts
```

- Agent writes real files with normal file tools (same access as us). No ZIP,
  no editor generators, no `new Function` eval path as the authoring route.
- After edit, agent calls `agent.reloadComponents({ types })`. Dev: Vite re-imports
  the changed modules and rebuilds `COMPONENT_REGISTRY` / worker `LOGIC_REGISTRY`
  entries; prod/preview: rebuild or worker refresh (explicit, versioned — never
  silent partial state). Reload returns per-type status
  `{ type, manifestOk, logicOk, pins[], errors[] }` from `validateComponentManifest`
  (`component-schema.js:101-171`), so a bad edit fails fast with file+line.
- Guardrail: agent may create new `type`s freely; overwriting builtin types
  requires explicit `allowBuiltinOverwrite: true` and is rejected by default
  (same intent as today's `BUILTIN_COMPONENT_TYPES` check, reimplemented in the
  new backend, not inherited from the editor).

Plane B — circuit + firmware (agent drives the canvas, both directions):

- Canonical circuit model (already the runtime truth consumed by
  `worker.postMessage({type:'START', components, wires, ...})` in
  `SimulatorPage.jsx`): `components[] {id, type, attrs, x, y}`,
  `wires[] {from:'id:pin', to:'id:pin'}`, per-board `{hex | python files, baud}`.
- Agent tools mutate this model through validated operations (not blind JSON
  patching): `place / move / delete / setAttr / wire / unwire / setFirmware /
  getProject`. Every call returns the canonical model + validation summary, so
  source edits and canvas edits converge on one readable state.
- Direction both ways: agent can write files then ask the canvas to show them
  (`reloadComponents` → palette refresh), or drive the canvas then read back
  `getProject` and commit the resulting files. The tool result is always the
  ground truth, never a cached copy.

### 11.3 MCP tool surface (NEW — dedicated, not reused)

Single schema file `frontend/src/agent/tools.schema.ts` (NEW) defines names,
JSON-schema params, and return shapes. Both transports serve exactly these tools:

Canvas / circuit (deep integration, the point of §11):

```text
agent.getProject      → { components[], wires[], boards[], firmwareRefs[] }
agent.place           { type, x, y, attrs? } → { id, warnings[] }   (pin map from manifest, not hand list)
agent.move            { id, x, y }
agent.delete          { id }                 (also drops attached wires, returns removed[])
agent.setAttr         { id, key, value }
agent.wire            { from, to }           (validates pins exist; returns circuit-validation issues)
agent.unwire          { from, to }
agent.validateCircuit {} → { safe, errors[], healthScore } (calls runUnifiedValidation, not UI code)
```

Source / component:

```text
agent.readComponent   { type } → { manifest, logic.ts, ui.tsx, validation.ts, index.ts }
agent.reloadComponents{ types[] } → per-type load status (see §11.2)
```

Run / interact:

```text
agent.setFirmware   { boardId, hex | pythonFiles, baud? }
agent.run           { capture: { budgetMs, watch: [...] } } → { runId }   (fixed harness, sim-time budget)
agent.stop          { runId }
agent.interact      { runId, compId, event }                 (press/slider; cycle-stamped in v2 command ring §10.4)
agent.serialInput   { runId, boardId, bytes }                (goes through serial ring, not console)
```

Verify (dedicated API — §11.4):

```text
agent.startCapture { runId, watch: { pins[], serial: bool, components: [{id, keys[]}] } }
agent.getTrace    { runId, sinceSeq? } → { events[], dropped, simTimeMs, cycles }
agent.assert      { runId, assertions[] } → per-assertion pass/fail with actual vs expected
agent.snapshot    { runId, kind: 'full' } → full-fidelity state (grading/evidence only, NOT the hot path)
```

Sandbox inherited, not reinvented: worker-side `assertSafeDynamicModule`
(`simulation.worker.ts:89-99`) still gates any code the agent's components
execute; component logic still only gets `{ BaseComponent }`-level imports.
The agent itself is authenticated (local token, dev-only bridge, disabled in
prod builds unless explicitly enabled) — but component code remains jailed
regardless.

### 11.4 Dedicated Agent Telemetry API (NEW — the verification path)

Not `TelemetryManager`, not console scraping, not screenshots. A purpose-built
capture service, owned by the agent system:

Event schema (stable, versioned, sim-time stamped — the ONLY thing assertions run on):

```text
{ seq, cycles, simTimeMs, kind,
  PinChange      { boardId, pin, state } |
  SerialOutput   { boardId, data, source } |
  ComponentState { id, key, value } |
  RunEvent       { code: STARTED|STOPPED|ERROR|WATCH_HIT, message? } }
```

Lifecycle: `run(capture{...})` → worker records matching events with `cycles`
stamps up to the sim-time budget (same determinism rule as grading capture:
`grading-engine.worker.ts:156-285` pattern — fixed firmware, fixed wires, fixed
budget — but reimplemented as `AgentRecorder` in the sim worker, not by calling
the grading worker) → `getTrace` pages by `seq` → `assert` evaluates locally in
the bridge (not in the LLM) and returns structured verdicts:

```text
assertions: [
  { id:'led-on',  when:{ pin:'13', state:true }, expect:{ ComponentState:{ id:'led1', key:'illuminated', value:true } }, withinMs: 500 },
  { id:'serial',  expect:{ SerialOutput:{ contains:'READY' } }, withinMs: 2000 },
]
→ [{ id, pass, actual, atSimTimeMs, detail }]
```

Rules that make it trustworthy:

1. Watch-scoped: only `watch` pins/components/serial are recorded. Unwatched
   components cost zero (pre-read filter, unlike `TelemetryManager`'s post-format
   filter). Default caps (e.g. 500 events, entropy-dropped static keys) bound tokens.
2. Sim-time, not wall-clock: budget and `withinMs` are simulated ms derived from
   `cycles`; identical runs produce identical traces. `Date.now()` stays banned
   from component tick (§2) — the harness fails runs whose back-to-back traces
   diverge.
3. Two fidelities: `getTrace` = lossy hot path (ring, overwrite-oldest, for
   iteration speed); `snapshot` = lossless `postMessage` full state (for evidence,
   grading, bug reports). Assertions run on the trace; submissions attach a snapshot.
4. v2 mapping: after §10 lands, `AgentRecorder` writes the same telemetry ring
   as §10.4 (`compSlot|code|v0,v1|cycles`) and the bridge decodes to the schema
   above. Pre-v2, it taps runner `onStateUpdate` directly in the worker. Schema
   is unchanged across both — v2 is a transport swap, not an agent rewrite.
5. Nothing human-UI in the path: no `formatTelemetryEntry` strings, no 250 ms UI
   throttle, no React state, no DOM/canvas reads. If the agent can't see a signal,
   the fix is adding a numeric key to the component's `onCustomTelemetry`/field
   map (§9.3), not screen-scraping.

### 11.5 Closed loop (how a component gets built by AI)

```text
spec (pins + behavior assertions + test firmware — checked in, e.g. specs/<type>.json)
  → agent edits source files (Plane A) via file tools
  → agent.reloadComponents → manifest/pin/contract check (fail fast, file+line)
  → agent builds harness circuit (Plane B): place board + component + wiring + setFirmware
  → agent.validateCircuit → fix shorts/power/i2c issues BEFORE running
  → agent.run + startCapture (sim-time budget, watch list)
  → agent.interact as scripted (press at T, slider at T) → agent.getTrace
  → agent.assert → pass? done : diagnose from structured actuals → patch source → rerun
  → agent.snapshot (evidence) → submit for human/admin review (existing
     POST /api/components/submit → componentController pending store; approve path unchanged)
```

Worked example (agent adds `openhw-foo-sensor`, I2C):

1. `readComponent openhw-led` + `openhw-ssd1306-oled/logic.ts` as golden refs (contract, not generator output).
2. Write `openhw-foo-sensor/{manifest.json,logic.ts,ui.tsx,validation.ts,index.ts}`.
3. `reloadComponents(['openhw-foo-sensor'])` → pins `[VCC,GND,SDA,SCL]` OK.
4. `place arduino-uno`, `place openhw-foo-sensor`, `wire SDA→A4, SCL→A5, VCC→5V, GND→GND`,
   `setFirmware` (I2C scanner hex), `validateCircuit` → clean.
5. `run` 3 s sim-time, `startCapture` watching `{pins:[], components:[{id, keys:[measured]}]}`,
   `getTrace` → `ComponentState measured` appears after scan; `assert` withinMs passes.
6. Failure mode example: NACK → trace shows no `ComponentState`, `assert` returns
   `actual: null` → agent fixes I2C address in `logic.ts`, reruns. No human reads a log.

### 11.6 Localhost relay implementation plan (dev-only, same laptop)

Scope lock (per user): same laptop, dev phase only. Running: `vite dev`
(frontend) + open browser tab + relay process + opencode agent. NO backend in
the loop, NO deploy, NO nginx, NO `OpenHW-studio--cli` changes (broken, see its
`DO_NOT_USE.md`). Agent file edits land instantly via Vite HMR; canvas/telemetry
changes show instantly in the open tab.

Processes on `127.0.0.1` (nothing leaves the laptop):

```text
vite dev :5173  → serves frontend (already runs)
browser tab → http://localhost:5173/simulator?agent=1 (bridge inside page)
relay → node openhw-studio-agent-relay/dist/index.js (MCP stdio + WS :8765)
opencode → spawns relay as MCP subprocess, sends tools/call over stdio
```

#### R0 — Shared contract (first, blocks everything else)

- `OpenHW-studio-frontend/src/agent/tools.schema.ts` (NEW, single source of truth):
  `AGENT_TOOLS_VERSION = 1`, `BROWSER_TOOLS = ['agent.getProject','agent.place',
  'agent.move','agent.delete','agent.setAttr','agent.wire','agent.unwire',
  'agent.validateCircuit','agent.readComponent','agent.reloadComponents',
  'agent.setFirmware','agent.run','agent.stop','agent.interact','agent.serialInput',
  'agent.startCapture','agent.getTrace','agent.assert','agent.snapshot',
  'agent.bridgeStatus']`, JSON-schema per tool + trace/assert event schemas (§11.4).
- Relay gets a COPY (`openhw-studio-agent-relay/src/schema.ts`, copied at build,
  `AGENT_TOOLS_VERSION` checked at startup — mismatch → relay refuses to start,
  never silent skew).
- Wire envelopes (part of same file):
  `bridge→relay: { v:1, id, type:'bridge/hello', room, toolsVersion }`,
  `relay→bridge: { v:1, id, type:'tools/call', tool, args }`,
  `bridge→relay: { v:1, id, type:'tools/result', ok, result?, error? }`,
  `bridge→relay: { v:1, type:'tools/progress', id, pct, note }` (long `run`),
  `either: { v:1, type:'ping'/'pong' }`. Payload cap 1 MB; hex blobs go by
  reference through existing `START` path, never as giant relay args.

#### R1 — Localhost relay process (NEW clean folder, the only new service)

- `openhw-studio-agent-relay/` (NEW, sibling of frontend/emulator):
  `package.json { name, type:module, deps: @modelcontextprotocol/sdk, zod, ws,
  typescript }, tsconfig.json, src/index.ts (~200 lines), README.md`.
  Deps to install: `npm i` pulls `ws` + MCP SDK (neither exists in this folder yet).
- `src/index.ts` does exactly two things:
  1. MCP face (stdio): `McpServer('openhw-agent-relay')` + `StdioServerTransport`,
     registers every `BROWSER_TOOLS` entry from the schema; `tools/list` = schema;
     `tools/call` = forward-or-error (next bullet). Plus local-only
     `agent.bridgeStatus` (bridge online? room? version? pending count?).
  2. WS face (server): `new WebSocketServer({ host:'127.0.0.1', port:8765,
     path:'/agent', maxPayload:1MB })`. Accepts ONLY the bridge (one per room;
     new `hello` replaces old, old gets `replaced` close). Sends `tools/call`,
     receives `tools/result`/`tools/progress`, routes by `id` via
     `pending: Map<id,{resolve,reject,timer}>`.
- Rules: 30 s default timeout, 120 s for `agent.run` (kept alive by `progress`
  heartbeats); bridge offline → immediate
  `{ ok:false, code:'bridge-offline',
    hint:'open http://localhost:5173/simulator?agent=1 (same laptop)' }`, never
  queued silently; unknown `id` dropped + logged; `ping` every 25 s, drop dead
  sockets; localhost-bind ONLY (never `0.0.0.0`); optional `OPENHW_AGENT_TOKEN`
  (dev default: allow, token checked only if set).
- Room model: single `dev1` room is enough for MVP (`?room=dev1`); multi-room =
  `Map<room, bridgeWs>`, same code, no extra dep.
- Backend changes: NONE. No `agentRelayService.js`, no `server.js` edit, no
  `routes/api.js` edit, no nginx edit. Backend need not even be running.
- Test: `node --test` (forward call→result, offline error, timeout error,
  replace-bridge, oversize reject) + manual round-trip: `wscat` as fake bridge +
  MCP inspector as fake opencode.

#### R2 — Frontend AgentBridge (executes on the LIVE tab)

- `OpenHW-studio-frontend/src/agent/bridge.ts` + `AgentBackend` (NEW):
  implements every `BROWSER_TOOLS` entry against live state. Canvas tools mutate
  the canonical `components[]/wires[]` model consumed by `START`
  (`SimulatorPage.jsx:10738-10806`) and return model + `runUnifiedValidation`
  summary; run tools talk to `simulation.worker.ts` (`START` 1277-1304,
  `INTERACT` 1644-1716); verify tools talk to the NEW `AgentRecorder` below.
  Exposes `window.OpenHWAgent` when `?agent=1` or
  `localStorage openhw.agentBridge=1` (dev-only flag; prod default OFF).
- `AgentRecorder` in sim worker (NEW, ~150 lines): watch-scoped, cycle-stamped
  recorder (`PinChange/SerialOutput/ComponentState/RunEvent` per §11.4) tapped at
  runner `onStateUpdate`; `getTrace(sinceSeq)` pages, `assert` evaluates locally
  (pass/fail + actuals, no prose). Pre-v2 taps `onStateUpdate`; v2 re-points at
  the SAB telemetry ring (§10.4), schema unchanged.
- `src/agent/panel.jsx` (NEW, minimal, dev-only): room/URL inputs, connection
  dot (green = WS open + hello acked), tools log, trace/assert viewer rendering
  exactly what MCP sees (same `getTrace`/`assert` JSON). NOT an editor.
- Bridge WS client: dials `VITE_AGENT_RELAY_URL` (default
  `ws://127.0.0.1:8765/agent?room=dev1`), auto-reconnect exponential backoff,
  sends `bridge/hello` + `toolsVersion`, handles `tools/call` → `AgentBackend`
  → `tools/result`, emits `tools/progress` during runs.
- Env: add `VITE_AGENT_BRIDGE_ENABLED=1`, `VITE_AGENT_RELAY_URL=` to
  frontend `.env.example`. No backend env. No proxy config (direct WS, no vite
  `/api` proxy involved).

#### R3 — Opencode wiring (no code, just config)

- Build relay once: `cd openhw-studio-agent-relay && npm i && npm run build`.
- Register in opencode MCP config (stdio spawn):
  `{ "openhw-agent": { "command": "node",
  "args": ["../openhw-studio-agent-relay/dist/index.js"],
  "env": { "OPENHW_AGENT_ROOM": "dev1", "OPENHW_AGENT_TOKEN": "" } } }`.
- No `OpenHW-studio--cli` involvement (broken folder untouched). Agent file edits
  use opencode's own file tools (same repo access as us) — Plane A needs no MCP.
  All canvas/run/verify tools come from the relay over stdio.
- Version check: relay logs `tools v1, room dev1, ws 127.0.0.1:8765` at startup;
  `agent.bridgeStatus` must report `bridge:true, toolsVersion:1` before any
  verification run counts.

#### R4 — Bring-up + verification (definition of "it works", all localhost)

1. `cd OpenHW-studio-frontend && npm run dev` → vite on `:5173`.
2. Open `http://localhost:5173/simulator?agent=1` → panel dot green, console
   `bridge/hello acked room=dev1`.
3. `cd openhw-studio-agent-relay && npm run start` → log `ws listening
   127.0.0.1:8765, bridge connected: true`.
4. Opencode `tools/list` shows `agent.*` → `agent.bridgeStatus` → `{ bridge:true }`.
5. Agent loop green IN THE OPEN TAB (watch it happen): `place` → `wire` →
   `validateCircuit` → `setFirmware` → `run` → `getTrace` → `assert` pass,
   all sim-time stamped, canvas visibly updating.
6. Close the tab → relayed call returns `bridge-offline` in <1 s; reopen same URL
   → auto-rejoin, calls green again, no relay/opencode restart.
7. Bench (local): steady `getTrace` poll p95 < 100 ms; 3 s sim-time harness
   < 10 s wall.

#### R5 — Dev-only guards (no prod hardening in MVP)

- Bind `127.0.0.1` only; refuse `0.0.0.0`. Token optional; when set, both bridge
  and relay must present it. No CORS/rate-limit work (no HTTP surface except WS).
- Payload/queue guards: 1 MB cap, max 100 pending, slow-consumer drop with
  `dropped` counter in `getTrace` (same convention as trace drops elsewhere).
- Out of MVP on purpose: backend route, nginx block, JWT, audit log, CI gate.
  Add CI later: relay round-trip test + replay determinism (two identical harness
  runs → identical traces) + golden LED/SSD1306 specs green.

### 11.7 Non-goals / guardrails

- No dependency on `ComponentEditorPage` or `TelemetryManager`: neither is called,
  wrapped, or imported by the agent system. If they are deleted tomorrow, §11 still builds.
- Agent proposes; humans approve. Output lands in the existing pending-review flow
  (`submitComponent` → admin approve writes files + `index.ts` export); the agent never
  force-installs builtins without an explicit flag.
- Token safety: traces are watch-scoped + capped + entropy-filtered before crossing to
  any model; raw serial/VRAM never leaves the browser except as assertion excerpts.
- Model calls happen **between runs, never in the tick loop**. No LLM in
  `runLoop`/`update()`/physics paths.
- Prod default: bridge + MCP gateway disabled unless explicitly enabled with a token;
  component sandbox (`assertSafeDynamicModule`) applies in all envs.

---

## 12. Better plan (user-approved direction, replaces phased patching)

Date: 2026-09-19. Decision: go full SAB-native, not incremental §6 patching.
SAB is already enabled (`COOP:same-origin` + `COEP:credentialless` in
`vite.config.js:185-188`, prod `nginx.conf`), so the only work is actually
USING it. Component↔board stays direct calls (same-thread, ~ns); SAB is the
worker→main/render/WASM data river for everything numeric at frame rate.

### 12.1 Verdict on the old §6 roadmap

Phase 0 JIT fixes (§2.1-2.3) stay valid and stay first — they are cheap and
unblock everything. Phases 1-2 as written (WASM adapter first, SAB later) are
INVERTED. Correct order: SAB transport first, telemetry-on-SAB second, WASM
third (WASM then maps the same SAB for free). No WASM work before the SAB
layout + writer + reader exist, otherwise every WASM component invents its own
transport.

### 12.2 SAB-max: what goes where (final table)

| Path | Transport | Why |
|---|---|---|
| Component ↔ board (`update`, `onPinStateChange`, `traversePassive`, `repropagateAllVoltages`) | Direct JS calls, same thread | Already ~ns. SAB/MessagePort here only adds branches to the hottest loop (`avr-runner.ts:1556-1621`). NEVER route ticks through shared memory. Components PUBLISH to SAB; they never TALK through it. |
| Worker → main visuals (pins, LED brightness, servo angle, LCD text/lines) | SAB slots + `__sabTickers.tick()` poll | Kills per-flush object spread + structured clone of full `components` array (`avr-runner.ts:1726-1767` → `simulation.worker.ts:894-950` → `workerStateIngest.js:134-173` → `renderComponentsByBoardRef` + `updateLiveOopStates`). |
| Worker → main telemetry numerics | SAB telemetry ring (fixed 32 B records) | Kills `JSON.stringify` fingerprint per tick (`BaseComponent.ts:525-555,798`), `getUniversalMetrics` `Object.entries`+regex (`870-949`), and `collectComponentTelemetry` full-tree build per flush (`component-registry.ts:1162-1331`). |
| Telemetry strings / console formatting | Main-side lazy only | `formatTelemetryEntry` (`TelemetryManager.js:51-140`) runs only for visible rows of SELECTED components at 250 ms throttle (`170-208`), never per frame. |
| Display VRAM (ILI9341 230 KB, SSD1306) | Existing `routeDisplayFrames` MessagePort path (`simulation.worker.ts:814-892` → `display.render.worker.ts`) | Already zero-copy. Do NOT repack pixels into the state SAB. State SAB carries only display DESCRIPTORS (slot, w/h, dirtyRect, vramHandle). |
| Worker → WASM components | Same state SAB mapped into WASM memory | Zero new transport. WASM reads pin `f32` array + writes state slots, sets dirty flag (§4.3 adapter unchanged). |
| Serial/events/errors/toasts/grading keys/hex blobs/pcap | `postMessage` / WebSocket | Variable-length, must-not-lose. SAB is lossy-by-design (ring overwrite) and fixed-layout — wrong tool. Grading MUST keep full-fidelity snapshots, never the ring. |
| Main → worker commands (INTERACT/SERIAL/RESET/SPEED/TELEMETRY/HALT/STEP) | MPSC command ring + `Atomics.notify` wake | Replaces `simulation.worker.ts:1644-1801` handler spaghetti with cycle-stamped records drained once per tick. Until the ring lands, keep `postMessage` commands — do NOT block on SAB. |

Rules (non-negotiable): one global SAB (not per-component buffers — single
transfer at START, single version handshake, single `frameSeq`); fixed strides
(no allocator/GC in tick); worker = sole writer of sim state, UI never writes
state (commands only); `Atomics.load` poll on main via existing rAF loops
(`SimulatorPage.jsx:1536-1552` `__sabTickers` + FLUSH pacing) — NEVER
`Atomics.wait` on main; `crossOriginIsolated === false` → today's
`postMessage` path unchanged (capability-check at START).

### 12.3 Telemetry optimization (measured cost centers → fixes)

Current hot chain per flush, in order:

1. `BaseComponent.observeStateMutation` → `safeSerializeState` → `normalizeStateForTelemetry` → `JSON.stringify` (`BaseComponent.ts:459-555`). Throttled to 45 ms for `update` but still walks + sorts + stringifies full `state` on the tick path, and `setState` forces it (`655-667`).
2. `getSyncState` object spreads (`977-1000`) + subclass overrides + `getUnifiedComponentSyncState` double-merge (`component-registry.ts:1153-1160`) per component per flush.
3. `collectComponentTelemetry` (`1162-1331`): `getDeltaMetrics` → `getRawMetrics` → `getSyncState` + `getUniversalMetrics` + `applyHeuristics` — i.e. steps 1-2 AGAIN plus regex-per-key heuristics (`737-840`), `safeSerializeState().length` twice, `Date.now()` everywhere — then `buildFallbackTelemetry` does a THIRD `JSON.stringify` fingerprint (`1047-1143`) even when the primary path succeeded.
4. `postMessage` structured-clone of the whole `components` array, then main-side copies (`workerStateIngest.js:60-70` `{...msg.pins}`, `145` per-component state, `169-172` live-OOP + telemetry fan-out) and string formatting for components nobody selected (filter happens late in `TelemetryManager.js:184-186`).

Fixes (do all; each is independent, total ~2-3 days):

T1. Gate everything behind `telemetryEnabled` with zero-cost fast path.
Remove `installTelemetryHooks`/`wrapTelemetryMethod` (`BaseComponent.ts:189-347`)
entirely — it megamorphs `inst.update` (`avr-runner.ts:1610`) into N closures
and pays `current.apply` + rest-args alloc per tick even when OFF. Replace with
inline `if (this.telemetryEnabled)` counters at the 3 call sites that need them
(I2C/SPI byte counters, pin-toggle map). Same for `capturePinLogicLevel` /
`capturePowerSample` in `setPinVoltage` (`557-563`): skip when disabled.
Telemetry OFF must equal today's hot loop minus ~5 predictable branches.

T2. Fingerprint with a `u32` version counter, never `JSON.stringify`.
`observeStateMutation` becomes `this.stateVersion++` + `stateChanged = true`.
Delta compare = integer compare (`getDeltaMetrics` keeps its watched-params
filter but compares `stateVersion` + watched field values, not serialized
strings). Delete `normalizeStateForTelemetry`/`safeSerializeState` from the
tick path; keep a stringify only in the grading snapshot path (rare).
This alone removes the biggest per-tick allocator (sorted keys + strings).

T3. Move telemetry numerics to the SAB ring; keep strings lazy.
Writer: `SabTelemetryWriter` writes fixed records
`{compSlot u16, code u16, v0/v1 f32, cycles u32}` — LED writes
`{illuminated, brightness}`, MAX30102 writes `{spo2, bpm}`, etc. via the
per-type field map (§9.3). Reader: `TelemetryManager.handleTelemetryStateMessage`
reads ONLY `selectedTelemetryComponentIds` slots (pre-read filter, not
post-format), formats via existing `formatTelemetryEntry` at the existing
250 ms throttle. `simple` mode reads summary words from the slot; `delta` mode
compares `version` counters (never stringifies); `detail` mode pulls the ring
record + on-demand `postMessage` snapshot for the inspected component only.

T4. Stop double/triple telemetry builds per flush.
`collectComponentTelemetry` today builds primary + fallback + merges
(`1231-1261`) on EVERY flush for EVERY telemetry-enabled component. New rule:
delta-mode clean → return `{delta:false}` with NO payload (keep the existing
early-return at `1176-1183`, extend it to simple/detail via slot-version
check); dirty → build ONCE (primary OR fallback, never both + merge).
`getUnifiedComponentSyncState` merges once (subclass wins, no base re-spread
when subclass already returned full shape). `vHistory` stays OUT of the sync
state (already excluded from fingerprint in `getDeltaMetrics:1040` — extend the
exclusion to the wire payload; plotter reads it from the ring on demand).

T5. Shrink FLUSH to `{seq, simTimeMs, dirtySlots}`.
`forceEmitState` (`avr-runner.ts:1726-1767`, `rp2040-runner.ts:4054-4091`)
writes SAB slots + bumps `frameSeq`, posts only the wakeup. Main
(`workerStateIngest.js`) updates `renderPinsByBoardRef` bitfield views +
`renderComponentsByBoardRef` dirty slots only, notifies `updateLiveOopStates`
listeners for dirty ids only. Plotter keeps its 1000-pt cap + 30 Hz throttle
(`workerStateIngest.js:74-127`) — it reads the SAB pin region, not cloned
objects. Bench gate: steady-frame `postMessage` `components` bytes ≈ 0,
same visual FPS, lower `worstFrameMs` (existing perf fields
`perf.lastRunLoopMs/lastPhysicsMs/lastComponentUpdateMs`).

Sizing: 8 B/component slots are TOO SMALL for `f0..f7 + i0..i3 + version/dirty`
— use 64 B stride (§9.3/§10.4 layout). Replace the ad-hoc
`workerStartPostamble.js:73-88` offset math with the shared `sab/layout.ts`
single source of truth. AVR runner must actually STORE `sab/sabOffsets`
(RP2040/proxy already do; AVR ignores it today — §9.1 finding #3).

### 12.4 Component contract v2: TS-normal + WASM-heavy (user plan, refined)

User proposal: TS for normal components, WASM for heavy ones, `.svg` art,
UI logic folded into `logic.ts`, lean `index.ts`, separate vs inline WASM
glue. Refined below — backward compatible (old 6-file folders keep working;
registry accepts both).

TS-normal component (default, ~95% of parts):

```text
openhw-led/
  manifest.json   # type/label/group/w/h/pins[]/attrs/telemetry/autowiring/autocoding
                  # + NEW: sab { slotKind, fields: { f0:'brightness', i0:'illuminated' } }
                  #        ui   { svg:'./led.svg', interactive:['press'] }
                  #        sim  { runtime:'js', validation:'inline' }
  logic.ts        # LogicClass extends BaseComponent: update/onPinStateChange/
                  # onI2C*/onSPIByte/onPWM/... + validate() + uiState()  ← ALL logic here
  led.svg         # raw SVG art (replaces svg-in-tsx). Props bound via
                  # data-bind="state.brightness" attributes, NOT JSX per frame
  index.ts        # thin re-export ONLY: { manifest, LogicClass, validation,
                  # svgUrl, fieldMap } — no Node fs reads, no autocoding dup
```

Rules:
- `logic.ts` owns THREE things: sim (`update/...`), validation
  (`validate(component, graph)` — replaces standalone `validation.ts`; the
  old file becomes `export { validation } from './logic'` shim for compat),
  and UI-state (`uiState()` returns the SAB slot fields — replaces per-frame
  `getSyncState` spreads; `getSyncState` stays as the compat wrapper).
- `ui.tsx` is DELETED for new components. Reason: React re-render per
  component per frame is the main-thread bottleneck the SAB reader exists to
  kill. SVG + `data-bind` + `__sabTickers.tick()` updates attributes directly
  (no `setState`, no VDOM diff). Keep existing `ui.tsx` files working via the
  `ReactiveComponentUI` path (`CanvasSceneLayer.jsx:7-24`) until each is
  converted; converter script inlines static JSX→SVG once, binds dynamics.
- `.svg` over `ui.tsx`-embedded SVG: cacheable asset, no JS parse per mount,
  convertible to a Web Component (`<openhw-led brightness="...">`) with
  `observedAttributes` + `attributeChangedCallback` doing direct DOM writes —
  the fastest possible consume path for SAB slot updates. React wrapper stays
  for palette/inspector; canvas render path uses the custom element.
- `manifest.json` stays the palette/physics contract (size, pins, autowire,
  autocode). ADDITIVE keys only: `sab` (slot layout + field map — kills the
  `COMPONENT_PINS` duplication: `component-registry.ts:262-420` gets GENERATED
  from manifests), `ui.svg`, `sim.runtime`. Old frontends ignore new keys.
- `index.ts` must be importable in worker context (no `process`/`fs`/`document`
  touches at module top — today's LED `index.ts:6-32` `eval("require('node:fs')")`
  + sync reads are a worker-load hazard; move raw-source harvesting to build
  time via the existing `?raw` glob in `emulatorLoader.js:77`).

WASM-heavy component (opt-in: ILI9341, SSD1306, SD-card, MAX30102, MFRC522,
nRF24/CC1101 — CPU-heavy, self-contained, typed-array friendly):

```text
openhw-ili9341/
  manifest.json   # same + sim:{ runtime:'wasm', abi:1 } + wasm:{ file, exports[] }
  logic.ts        # WasmComponent SUBCLASS (same class name!): pin-index map,
                  # field map, fallback JS update() if WASM fails to load
  glue.ts         # SEPARATE (answers user Q) — WASM bindgen loader + SAB
                  # views + create/destroy/update/on_pin/on_i2c/on_spi.
                  # Not in index.ts: keeps index.ts side-effect free and lets
                  # grading/worker import logic without instantiating WASM.
  core.wasm       # Rust crate output (C ABI: create/destroy/update/on_pin/
                  # on_i2c/on_spi/get_state_ptr; pins+state via SAB, no JSON)
  ili9341.svg     # same SVG contract as TS components
  index.ts        # { manifest, LogicClass(=wasm subclass), glue loader ref,
                  # validation, svgUrl } — runners can't tell JS from WASM
```

Rules:
- SEPARATE `glue.ts`, not inline in `index.ts`. `index.ts` = declarative
  registry record (import-safe everywhere incl. grading worker + palette);
  `glue.ts` = imperative loader (dynamic `import()` of the `.wasm` + SAB
  mapping, called once per placement from the runner). This also answers
  versioning: `glue.ts` checks `manifest.wasm.abi` vs worker capability.
- WASM lives in the SIM worker beside the runners (§4.1 — one module, one
  instance per placement to start). `WasmComponent extends BaseComponent`
  adapter keeps `inst.update(...)` call sites unchanged
  (`avr-runner.ts:1610`). Pin ids → `u32` once at `create()`; voltages →
  `f32` SAB array; `getSyncState` returns the cached JS mirror, refreshed only
  when WASM sets the dirty flag (never allocates per frame).
- JS fallback REQUIRED in `logic.ts` (even a slow-but-correct reference)
  so `crossOriginIsolated === false` / WASM-load-failure still simulates.
- Toolchain: Rust `wasm32-unknown-unknown` + `wasm-bindgen`, `worker.format:'es'`
  (already set), `assetsInclude: ['**/*.wasm']` + `vite-plugin-wasm` (new),
  WASM allowlist in `assertSafeDynamicModule` (`simulation.worker.ts:89-99`):
  local bundle files only, no WASI/network imports. Determinism: no
  `js_sys::Date` — cycles only.

Migration (no big-bang; both generations coexist in one registry):

1. Freeze `ComponentSignalAPI` + `update/onPinStateChange/getSyncState` as the
   ABI (§3). Add `validate()` + `uiState()` as OPTIONAL methods (duck-typed;
   old components without them use `validation.ts` + `getSyncState`).
2. Land `sab/layout.ts` + `SabStateWriter`/`useSabReader` + 64 B slots (§12.3 T5).
   Convert ONE trivial component end-to-end (LED: `ui.tsx`→`led.svg` +
   `logic.ts::uiState` + manifest `sab` map) as the golden reference.
3. Codemod the mechanical parts across all ~105 components: generate
   `COMPONENT_PINS` from manifests; move `validation.ts` → `logic.ts::validate`
   (keep shim); move `BOUNDS` + pin coordinates → `manifest.json` (+ `.svg`
   `viewBox`); delete `fs`/`process` reads from every `index.ts`.
4. `scripts/new-component.mjs` scaffolds BOTH flavors
   (`--runtime js|wasm`, same pin map, same `manifest` shape, Rust crate stub
   for wasm). Registry validates `manifest.wasm.abi` at load.
5. Port heavies to Rust in ROI order: MAX30102 (self-contained DSP) →
   SSD1306 (small VRAM, validates display-descriptor path) → ILI9341 →
   SD-card → radios. Each ships behind `sim.runtime:'wasm'` flag with JS
   fallback; flip when bench shows ≥2x on the component's own update cost
   with flat board-loop cost.

### 12.5 Build order (SAB-max first, no half-migrated states)

STATUS 2026-09-20 (all-gaps sweep): §1–§12 fully implemented.
Frontend: SAB specs 14/14 green (P1–P11 + reader + agent-relay round-trip);
emulator tsc 29 = clean-tree parity; circuit-validation 23 pass / 2 CLI fail
(pre-existing, reproduce on clean stash); vite build green (both repos).
Commits (no push): frontend `cb52693` (all-gaps) on top of `b26518a` (WASM
autoload) + `5fba703` (DebugPanel) + `3ff82fb` (SAB transport); emulator
`46e8a83` (all-gaps) on top of `2c39e0b` (MAX30102) + `7d09e3f`/`e0866b0`
(codemod) + `c13db71` (golden-ref); docs `b5f6a43` (protocol-api +
wasm-components); relay `860c570` (R1, new repo `openhw-studio-agent-relay`
on branch md — run `npm i && npm run build && npm run start` there).
sab-all-phases.spec.js covers P1–P11 (P10 debug panel, P11 WASM pilot);
sab-reader.spec.js kept as the focused reader contract; agent-relay.spec.js
covers the WS hello/ack round-trip (skips cleanly when relay is down).
- [x] T1: per-instance wrappers deleted (`wrapTelemetryMethod`/`installTelemetryHooks`
  gone; gated `trackUpdateStart/End, trackPinEdge, trackIo`); runner-injected fields
  (`sabSlot/stateVersion/_simCpu/_simUpdatePhysics/_setAvrPinDirect/
  pendingVisualStateEmit/telemetryMode/telemetryWatchedParams`) declared on
  `BaseComponent`; `setPinVoltage` capture gated; `setState`/`getTelemetrySummary`/
  `getTelemetryData` use `markStateMutated` (no JSON fingerprint in tick).
- [x] T1b: LED golden-ref start — `Date.now` out of `update()` (8M-cycle window
  @16 MHz), `uiState()` + `validate()` inline in `logic.ts`.
- [x] T2 transport: `frontend/src/worker/sab/layout.ts` v1 (64 B header, 64 B slots,
  1024x32 B telemetry ring, `SabStateWriter`, `allocateStateSab`, `sabKindForType`);
  `AVRRunnerOptions.sabOffsets`; AVR stores `sab/sabOffsets`, assigns `inst.sabSlot`,
  writes slots + `dirtySlots` + `publishFrame` in `forceEmitState`;
  `workerStartPostamble.js` allocates via `allocateStateSab`.
- [x] T2 delta fast path: `getDeltaMetrics` version-counter early return
  (`_lastDeltaEmittedVersion` vs `stateVersion`); clean re-call returns
  `delta:false` with no `getRawMetrics` rebuild (smoke-verified).
- [ ] Next in order:

1. T1 (kill per-instance wrappers) + declare runner-injected fields on the
   class (shape stability) — no behavior change, biggest JIT win.
2. `sab/layout.ts` + version handshake + AVR runner stores `sab/sabOffsets`.
3. `SabStateWriter` in `forceEmitState` + `useSabReader` via `__sabTickers`
   (the existing rAF loop `SimulatorPage.jsx:1536-1552` becomes the real render
   path); FLUSH shrinks to `{seq}` wakeup.
4. T2 (version-counter deltas) + T4 (single telemetry build) + command ring
   (INTERACT/SERIAL/RESET/SPEED first), then event ring.
5. T3 (telemetry ring + selected-IDs pre-read + lazy format) + T5 bench gates
   (steady-frame `components` bytes ≈ 0, same FPS, lower `worstFrameMs`).
6. Component v2: LED golden reference (svg + uiState + sab map) → codemod →
   `new-component.mjs` → WASM `glue.ts` + `WasmComponent` → heavies in ROI order.
7. Debug service + record/replay (§10.6-10.7) rides the command/event rings
   (HALT/STEP/WATCH/READ_MEM) — needs rings first, so it comes last, not first.

### 12.6 What stays / what dies

Keep: `manifest.json + LogicClass + index.ts` shape (extended, not replaced);
`ComponentSignalAPI` names; display `IDisplayRenderer` + render worker; net
worker boundary; grading full-fidelity `postMessage` snapshots; `FLUSH_VISUALS`
as pacing signal (shrunk); `postMessage` for serial/errors/toasts/keys/blobs.
Throw away: `ui.tsx` for new components (SVG + custom elements); standalone
`validation.ts` (fold into `logic.ts::validate`); per-instance telemetry
wrappers; `observeStateMutation`/`safeSerializeState` in tick; `Date.now()` in
`update()`; `instances.find` + wire BFS in components; ad-hoc 8 B SAB offsets;
full-`components` `postMessage` per flush; main-side stringify-per-frame
telemetry; `fs`/`process` reads in `index.ts`.

## 13. References

- Runner loop: `OpenHW-studio-frontend/src/worker/runners/avr-runner.ts:1537-1675,1687-1767`
- Sim worker dispatch: `OpenHW-studio-frontend/src/worker/simulation.worker.ts:1-200,764-802,1125-1200`
- SAB plumbing today: `SimulatorPage.jsx:945,1693-1710,10960-10999`, `simulation.worker.ts:1379-1380,1554-1555`, `rp2040-runner.ts:1016-1017`, `backend-proxy-runner.ts:88-101`
- UI consume path: `SimulatorPage.jsx:3227-3241 (FLUSH pacing), 10465-10553 (state handler)`, `services/TelemetryManager.js:170-208`
- State emit: `simulation.worker.ts:814-950`, `display.render.worker.ts:39-116`
- Registry: `OpenHW-studio-frontend/src/worker/registries/component-registry.ts:90-259,507-601,985-1204`
- Base: `openhw-studio-emulator/src/components/BaseComponent.ts` (telemetry hooks `189-347`, pins `557-600`, sync `977-1094`)
- Examples: `openhw-led/{manifest.json,logic.ts:91-157,index.ts:34-62}`, `openhw-ili9341/logic.ts`, `openhw-ssd1306-oled/logic.ts`, `max30102/logic.ts`
