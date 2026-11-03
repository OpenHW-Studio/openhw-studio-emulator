import { BaseComponent } from '../BaseComponent';

export class Logic extends BaseComponent {
    private currentSample: number = 0;
    private bitsShifted: number = 0;
    private bpf: number = 32; // Default 32-bit slot for I2S Microphones
    private lastSck: boolean = false;
    private lastWs: boolean = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.setPinVoltage('SD', 0);
    }

    /**
     * Resolve the board pin sharing the SD net (e.g. "12").
     * Cached after first success; null is NOT cached (retries until wired).
     */
    private getConnectedBoardPin(): string | null {
        if ((this as any)._connectedPin != null) return (this as any)._connectedPin;
        try {
            const netOf = (this as any)._boardNetOf;
            if (typeof netOf === 'function') {
                const pin = netOf('SD');
                if (pin) { (this as any)._connectedPin = pin; return pin; }
            }
        } catch { /* fall through to legacy scan */ }
        try {
            const runner = (this as any)._simCpu?._avrRunner;
            const wires = runner?.currentWires;
            if (Array.isArray(wires)) {
                for (const wire of wires) {
                    const from: string = wire.from || '';
                    const to: string = wire.to || '';
                    if (from.startsWith(this.id + ':SD')) {
                        const pin = to.split(':')[1] ?? null;
                        if (pin) { (this as any)._connectedPin = pin; return pin; }
                    } else if (to.startsWith(this.id + ':SD')) {
                        const pin = from.split(':')[1] ?? null;
                        if (pin) { (this as any)._connectedPin = pin; return pin; }
                    }
                }
            }
        } catch { /* ignore */ }
        return null;
    }

    /** Drive SD both locally (UI/telemetry/wire net) and into the engine input. */
    private driveSD(voltage: number) {
        this.setPinVoltage('SD', voltage);
        const isHigh = voltage > 1.8;
        const boardPin = this.getConnectedBoardPin();
        if (boardPin && typeof (this as any)._driveBoardPin === 'function') {
            (this as any)._driveBoardPin(boardPin, isHigh);
        } else if (boardPin && typeof (this as any)._setAvrPinDirect === 'function') {
            (this as any)._setAvrPinDirect(boardPin, isHigh);
        }
        (this as any)._simUpdatePhysics?.();
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            liveMicEnabled: this.state.liveMicEnabled ? "Yes" : "No",
            peakAmplitude: Number(this.state.peakAmplitude || 0).toFixed(3)
        });
    }

    override onPinStateChange(pinId: string, isHigh: boolean, cycles: number): void {
        const pin = pinId.toUpperCase();
        
        if (pin === 'WS') {
            if (this.lastWs !== isHigh) {
                // Next word
                this.lastWs = isHigh;
                this.bitsShifted = 0;
                
                // Fetch next sample from micBuffer
                const buf: Float32Array | null = this.state.micBuffer;
                let idx = Number(this.state.bufferIndex || 0);
                
                if (buf && buf.length > 0) {
                    if (idx >= buf.length) idx = 0;
                    
                    // The sample is float -1.0 to 1.0. Convert to 24-bit signed int (I2S mics often output 24 bits in a 32-bit slot)
                    const floatSample = buf[idx];
                    this.currentSample = Math.floor(floatSample * 8388607); 
                    
                    this.state.bufferIndex = idx + 1;
                    this.state.peakAmplitude = Math.max(Number(this.state.peakAmplitude || 0), Math.abs(floatSample));
                } else {
                    // Fallback simulated sine wave if no real mic data is available
                    const time = performance.now() / 1000;
                    const fallbackSample = Math.sin(time * 440 * 2 * Math.PI) * 0.5; // 440Hz sine
                    this.currentSample = Math.floor(fallbackSample * 8388607);
                }
            }
        }
        
        // DMA Bypass Optimization
        const dmaAddress = parseInt(this.attrs?.dmaAddress || this.state?.dmaAddress || '0', 16);
        if (dmaAddress > 0) {
            // Bypass pin bit-banging if DMA address is configured.
            // We write the current sample directly to the PIO RX FIFO or SRAM address.
            const runner = (this as any)._runner;
            if (runner && runner.writeDirectMemory && pin === 'WS' && this.lastWs !== isHigh) {
                // Write 32-bit sample directly to the provided memory address
                const sampleArray = new Uint8Array([
                    this.currentSample & 0xff,
                    (this.currentSample >> 8) & 0xff,
                    (this.currentSample >> 16) & 0xff,
                    (this.currentSample >> 24) & 0xff
                ]);
                runner.writeDirectMemory(dmaAddress, sampleArray);
            }
            return;
        }

        if (pin === 'SCK') {
            const falling = this.lastSck && !isHigh;
            this.lastSck = isHigh;
            
            // I2S changes data on falling edge of SCK so receiver can sample on rising edge
            if (falling) {
                if (this.bitsShifted === 0) {
                    // 1 SCK delay for standard I2S
                    this.driveSD(0);
                    this.bitsShifted++;
                } else if (this.bitsShifted <= 24) { // 24 bit data
                    // MSB first
                    const bit = (this.currentSample & (1 << (24 - this.bitsShifted))) !== 0 ? 1 : 0;
                    this.driveSD(bit ? 3.3 : 0);
                    this.bitsShifted++;
                } else {
                    // Pad with 0
                    this.driveSD(0);
                    this.bitsShifted++;
                }
            }
        }
    }

    override onEvent(event: any): void {
        if (event && event.type === 'mic_data' && Array.isArray(event.data)) {
            this.state.micBuffer = event.data;
            this.state.bufferIndex = 0;
            this.state.liveMicEnabled = true;
        } else if (event && event.type === 'mic_error') {
            this.state.liveMicEnabled = false;
        }
    }

    // 12.4 v2: numeric UI state for SAB slot {f0: peakAmplitude} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {peakAmplitude: Number(s.peakAmplitude ?? 0)},
            i: {},
        };
    }
    validate(_component: any, _graph: Map<string, string[]>) {
        return null;
    }
}
