import { BaseComponent } from '../components/BaseComponent';

export interface NeoPixelEdgeState {
    lastCycle: number;
    buffer: number[];
    currentBit: number;
    currentByte: number;
}

export class NeoPixelProtocol extends BaseComponent implements NeoPixelEdgeState {
    /** Timing state — public only so clockEdge() can share it (not API). */
    lastCycle = 0;
    buffer: number[] = [];
    currentBit = 0;
    currentByte = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            ...this.state,
            pixels: []
        };
    }
    
    private cpuFreqMHz = 16;
    private freqDetected = false;

    getNeoPixelPinName(): string {
        return 'DIN';
    }

    onNeoPixelFrame(pixels: number[]): void {
        // Subclasses override
    }
    
    update(cpuCycles: number, currentWires: any[], instances: BaseComponent[]) {
        super.update(cpuCycles, currentWires, instances);
        
        if (!this.freqDetected && instances) {
            // instances may be a Map on the runner fast path — iterate both.
            const list: any[] = instances instanceof Map ? [...instances.values()] : (instances as any[]);
            const hasPico = list.some(i => i.manifest?.type?.includes('pico'));
            const hasEsp32 = list.some(i => i.manifest?.type?.includes('esp32'));
            if (hasPico) {
                this.cpuFreqMHz = 125;
            } else if (hasEsp32) {
                this.cpuFreqMHz = 240;
            } else {
                this.cpuFreqMHz = 16;
            }
            this.freqDetected = true;
        }
        
        // DMA Bypass Optimization for NeoPixels
        const dmaAddress = parseInt(this.attrs?.dmaAddress || this.state?.dmaAddress || '0', 16);
        const numLeds = parseInt(this.attrs?.numLeds || this.state?.numLeds || '64', 10);
        
        const hasLogicAnalyzer = this.isLogicAnalyzerAttached(instances);
        if (hasLogicAnalyzer) {
            this.state.dmaBypassDisabled = true;
            return; // Skip DMA polling and fallback to bit-banging
        }
        
        if (dmaAddress > 0) {
            // Polling at roughly 60Hz (assuming update is called frequently)
            const runner = (this as any)._runner;
            if (runner && runner.readDirectMemory && runner.getSimulatedTimeMs) {
                const nowMs = runner.getSimulatedTimeMs();
                // 16ms = ~60Hz
                if (!this.lastCycle || (nowMs - this.lastCycle) > 16) {
                    this.lastCycle = nowMs;
                    // Read numLeds * 3 bytes from memory
                    const dmaData = runner.readDirectMemory(dmaAddress, numLeds * 3);
                    if (dmaData) {
                        const pixels = [];
                        for (let i = 0; i < dmaData.length; i += 3) {
                            const g = dmaData[i] || 0;
                            const r = dmaData[i + 1] || 0;
                            const b = dmaData[i + 2] || 0;
                            pixels.push((r << 16) | (g << 8) | b);
                        }
                        this.state.pixels = pixels;
                        this.stateChanged = true;
                        this.onNeoPixelFrame(pixels);
                    }
                }
            }
        }
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number): void {
        super.onPinStateChange(pinId, isHigh, cpuCycles);

        // Skip bit-banging if DMA is configured
        const dmaAddress = parseInt(this.attrs?.dmaAddress || this.state?.dmaAddress || '0', 16);
        if (dmaAddress > 0 && !this.state.dmaBypassDisabled) return;

        if (pinId === this.getNeoPixelPinName()) {
            const pixels = NeoPixelBusFramer.clockEdge(this, isHigh, cpuCycles, this.cpuFreqMHz);
            if (pixels) {
                this.state.pixels = pixels;
                this.stateChanged = true;
                this.onNeoPixelFrame(pixels);
            }
        }
    }
}

/**
 * NeoPixelBusFramer — composition helper for WASM-heavy components (§12.4).
 * Pure WS2812 timing decode (no update/WASM knowledge). The static
 * clockEdge() is shared with NeoPixelProtocol above so JS and WASM paths
 * agree bit-for-bit; it returns the completed pixel array on reset, else
 * null. A WASM-heavy NeoPixel component extends WasmComponent DIRECTLY,
 * owns a NeoPixelBusFramer, feeds edges via pushEdge(), and routes via
 * routeNeoPixel().
 */
export interface NeoPixelFrameEvents {
    onFrame?(pixels: number[]): void;
}

export class NeoPixelBusFramer implements NeoPixelEdgeState {
    lastCycle = 0;
    buffer: number[] = [];
    currentBit = 0;
    currentByte = 0;
    constructor(
        private cpuFreqMHz = 16,
        private readonly events: NeoPixelFrameEvents = {},
    ) {}

    setCpuFreqMHz(mhz: number): void { this.cpuFreqMHz = mhz; }

    /** Shared GRB→RGB packer (matches protocol base). */
    static packPixels(buffer: number[]): number[] {
        const pixels = [];
        for (let i = 0; i < buffer.length; i += 3) {
            const g = buffer[i] || 0;
            const r = buffer[i + 1] || 0;
            const b = buffer[i + 2] || 0;
            pixels.push((r << 16) | (g << 8) | b);
        }
        return pixels;
    }

    /**
     * Shared edge step: advances {lastCycle, buffer, currentBit,
     * currentByte} and returns completed pixels on reset, else null.
     */
    static clockEdge(
        state: NeoPixelEdgeState,
        isHigh: boolean, cpuCycles: number, cpuFreqMHz: number,
    ): number[] | null {
        const elapsed = cpuCycles - state.lastCycle;
        state.lastCycle = cpuCycles;

        if (isHigh) {
            // Rising edge. The time spent LOW is `elapsed`.
            const resetThreshold = cpuFreqMHz * 25; // 25us minimum for reset
            if (elapsed > resetThreshold) {
                // Reset
                let pixels: number[] | null = null;
                if (state.buffer.length > 0) {
                    pixels = NeoPixelBusFramer.packPixels(state.buffer);
                    state.buffer = [];
                }
                state.currentBit = 0;
                state.currentByte = 0;
                return pixels;
            }
        } else {
            // Falling edge. The time spent HIGH is `elapsed`.
            // A 0-bit is ~0.4us. A 1-bit is ~0.8us.
            // Threshold between 0 and 1 is ~0.5625us.
            const threshold = cpuFreqMHz * 0.5625;
            const bit = elapsed >= threshold ? 1 : 0;
            state.currentByte = (state.currentByte << 1) | bit;
            state.currentBit++;

            if (state.currentBit === 8) {
                state.buffer.push(state.currentByte);
                state.currentByte = 0;
                state.currentBit = 0;
            }
        }
        return null;
    }

    /** Feed one DIN edge; returns completed pixels on reset, else null. */
    pushEdge(isHigh: boolean, cpuCycles: number): number[] | null {
        const pixels = NeoPixelBusFramer.clockEdge(this, isHigh, cpuCycles, this.cpuFreqMHz);
        if (pixels) this.events.onFrame?.(pixels);
        return pixels;
    }
}
