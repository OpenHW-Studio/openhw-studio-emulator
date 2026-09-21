import { BaseComponent } from '../components/BaseComponent';

export class I2SProtocol extends BaseComponent {
    protected sampleQueue: number[] = [];
    protected bufferSize = 1024;
    protected lastFlushTime = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        
        this.state = {
            ...this.state,
            i2sBitsPerFrame: this.getI2SBitsPerFrame(),
            lastLeftSample: 0,
            lastRightSample: 0,
            totalFrameCount: 0,
            peakAmplitude: 0,
            i2sAudioChunk: null
        };
    }

    getI2SBitsPerFrame(): number {
        return 16;
    }

    getI2SDataPinNames(): string[] {
        return ['DIN', 'DOUT', 'SDATA', 'SD', 'RX', 'TX'];
    }

    update(cpuCycles: number, currentWires: any[], instances: BaseComponent[]) {
        super.update(cpuCycles, currentWires, instances);
        
        // DMA Bypass Optimization for I2S DACs/Speakers
        const dmaAddress = parseInt(this.attrs?.dmaAddress || this.state?.dmaAddress || '0', 16);
        const dmaLength = parseInt(this.attrs?.dmaLength || this.state?.dmaLength || '1024', 10);
        
        const hasLogicAnalyzer = this.isLogicAnalyzerAttached(instances);
        if (hasLogicAnalyzer) {
            this.state.dmaBypassDisabled = true;
            return; // Skip DMA polling and fallback to bit-banging
        }
        
        if (dmaAddress > 0) {
            const runner = (this as any)._runner;
            if (runner && runner.readDirectMemory && runner.getSimulatedTimeMs) {
                const nowMs = runner.getSimulatedTimeMs();
                // Fetch at roughly ~40Hz (25ms) or adjust to prevent buffer underrun
                if (!this.lastFlushTime || (nowMs - this.lastFlushTime) > 25) {
                    this.lastFlushTime = nowMs;
                    // dmaLength is assumed in bytes. 16-bit audio = 2 bytes per sample.
                    const rawData = runner.readDirectMemory(dmaAddress, dmaLength);
                    if (rawData) {
                        const chunk = [];
                        let maxPeak = 0;
                        // Assuming 16-bit signed PCM (Little Endian)
                        for (let i = 0; i < rawData.length; i += 2) {
                            const low = rawData[i];
                            const high = rawData[i + 1];
                            let sample16 = (high << 8) | low;
                            // Convert to signed 16-bit
                            if (sample16 > 32767) sample16 -= 65536;
                            
                            const normalized = sample16 / 32768.0;
                            chunk.push(normalized);
                            if (Math.abs(normalized) > maxPeak) {
                                maxPeak = Math.abs(normalized);
                            }
                        }
                        this.state.i2sAudioChunk = chunk;
                        this.state.peakAmplitude = maxPeak;
                        this.stateChanged = true;
                    }
                }
            }
        }
    }

    onI2SFrame(channel: 0 | 1, sample: number, bitsPerFrame: number): void {
        const dmaAddress = parseInt(this.attrs?.dmaAddress || this.state?.dmaAddress || '0', 16);
        if (dmaAddress > 0 && !this.state.dmaBypassDisabled) return; // Ignore bit-banged frames if DMA is active

        const maxVal = 2147483648; // Math.pow(2, 31) because rp2040-runner sign-extends to 32 bits
        let normalized = sample / maxVal;
        
        // Ensure within -1.0 to 1.0
        if (normalized > 1.0) normalized = 1.0;
        if (normalized < -1.0) normalized = -1.0;

        const absNormalized = Math.abs(normalized);

        if (channel === 0) {
            this.state.lastLeftSample = normalized;
        } else {
            this.state.lastRightSample = normalized;
            this.state.totalFrameCount = Number(this.state.totalFrameCount || 0) + 1;
        }

        if (absNormalized > Number(this.state.peakAmplitude || 0)) {
            this.state.peakAmplitude = absNormalized;
        }

        // Buffer for Web Audio chunking (interleaved Left, Right, Left, Right...)
        // We push both channels into the queue for stereo or mono. 
        // We'll let the frontend decode it based on length.
        this.sampleQueue.push(normalized);

        // Flush buffer if it's full or 20ms has passed
        const now = performance.now();
        if (this.sampleQueue.length >= this.bufferSize || (now - this.lastFlushTime > 20 && this.sampleQueue.length > 128)) {
            this.state.i2sAudioChunk = [...this.sampleQueue];
            this.sampleQueue = [];
            this.lastFlushTime = now;
            this.stateChanged = true;
        } else {
            // Still mark state changed for visual peak amplitude (throttled by the runner anyway)
            this.stateChanged = true;
        }
    }

    onI2SWordSelect(channel: 0 | 1): void {
        // Optional override for WS transition edge
    }

    /**
     * Shared normalizer: 32-bit sign-extended sample → -1.0..1.0 float.
     * WASM-heavy I2S components reuse this (same clamping as the TS path)
     * before routeI2SFrame() so JS and core agree bit-for-bit.
     */
    static normalizeSample(sample: number): number {
        const maxVal = 2147483648;
        let normalized = sample / maxVal;
        if (normalized > 1.0) normalized = 1.0;
        if (normalized < -1.0) normalized = -1.0;
        return normalized;
    }
}

/**
 * I2sBusFramer — composition helper for WASM-heavy components (§12.4).
 * Pure L/R interleave + chunking (no update/WASM knowledge). Feed decoded
 * frames via pushFrame(); when the buffer fills (or 20ms passes with
 * ≥128 samples) onChunk fires — mirroring I2SProtocol thresholds. A
 * WASM-heavy I2S component extends WasmComponent DIRECTLY, owns an
 * I2sBusFramer, and routes per-frame via routeI2SFrame().
 */
export interface I2sFrameEvents {
    onFrame?(channel: 0 | 1, normalized: number): void;
    onChunk?(chunk: number[], peak: number): void;
}

export class I2sBusFramer {
    private queue: number[] = [];
    private peak = 0;
    private lastFlushMs = 0;
    constructor(
        private readonly bufferSize = 1024,
        private readonly events: I2sFrameEvents = {},
    ) {}

    /** Feed one decoded frame (already normalized to -1.0..1.0). */
    pushFrame(channel: 0 | 1, normalized: number, nowMs: number): void {
        const v = Math.max(-1.0, Math.min(1.0, normalized));
        const abs = Math.abs(v);
        if (abs > this.peak) this.peak = abs;
        this.queue.push(v);
        this.events.onFrame?.(channel, v);
        if (this.queue.length >= this.bufferSize
            || (nowMs - this.lastFlushMs > 20 && this.queue.length > 128)) {
            this.events.onChunk?.([...this.queue], this.peak);
            this.queue = [];
            this.lastFlushMs = nowMs;
        }
    }

    get pending(): number { return this.queue.length; }
    get peakAmplitude(): number { return this.peak; }
}
