import { BaseComponent } from '../components/BaseComponent';

export class NeoPixelProtocol extends BaseComponent {
    private lastCycle = 0;
    private buffer: number[] = [];
    private currentBit = 0;
    private currentByte = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            ...this.state,
            pixels: []
        };
    }

    getNeoPixelPinName(): string {
        return 'DIN';
    }

    onNeoPixelFrame(pixels: number[]): void {
        // Subclasses override
    }
    
    update(cpuCycles: number, currentWires: any[], instances: BaseComponent[]) {
        super.update(cpuCycles, currentWires, instances);
        
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
            const elapsed = cpuCycles - this.lastCycle;
            this.lastCycle = cpuCycles;

            if (isHigh) {
                // Rising edge. The time spent LOW is `elapsed`.
                if (elapsed > 400) {
                    // Reset > 25us (400 cycles @ 16mhz)
                    if (this.buffer.length > 0) {
                        const pixels = [];
                        for (let i = 0; i < this.buffer.length; i += 3) {
                            const g = this.buffer[i] || 0;
                            const r = this.buffer[i + 1] || 0;
                            const b = this.buffer[i + 2] || 0;
                            pixels.push((r << 16) | (g << 8) | b);
                        }
                        this.state.pixels = pixels;
                        this.stateChanged = true;
                        this.buffer = [];
                        this.onNeoPixelFrame(pixels);
                    }
                    this.currentBit = 0;
                    this.currentByte = 0;
                }
            } else {
                // Falling edge. The time spent HIGH is `elapsed`.
                // A 0-bit is ~0.4us (6.4 cycles). A 1-bit is ~0.8us (12.8 cycles). Threshold 9:
                const bit = elapsed >= 9 ? 1 : 0;
                this.currentByte = (this.currentByte << 1) | bit;
                this.currentBit++;

                if (this.currentBit === 8) {
                    this.buffer.push(this.currentByte);
                    this.currentByte = 0;
                    this.currentBit = 0;
                }
            }
        }
    }
}
