// @ts-nocheck
import { BaseComponent } from '../BaseComponent';

export class HX711Logic extends BaseComponent {
    private load: number = 0;
    private pulseCount: number = 0;
    private lastSck: number = 0;
    private nextSampleTime: number = 0;
    private currentData: number = 0;

    init() {
        this.pin('DT').mode('output');
        this.pin('DT').write(1); // HIGH means not ready
        this.pin('SCK').mode('input');

        // Set initial state
        const initialLoad = parseFloat(this.attrs.load || '0');
        if (!isNaN(initialLoad)) {
            this.load = initialLoad;
        }

        this.nextSampleTime = this.time + 100_000; // 10Hz sampling rate
    }

    onInteract(event: any) {
        if (event.type === 'input' && event.load !== undefined) {
            this.load = parseFloat(event.load);
            this.updateState({ load: event.load });
        }
    }

    update(deltaTime: number) {
        // Prepare new data at 10Hz if we're not in the middle of shifting data
        if ((this.pulseCount === 0 || this.pulseCount >= 25) && this.time >= this.nextSampleTime) {
            // raw readings are 0-2100 for 0-5kg on the 5kg load cell type
            let rawValue = Math.round((this.load / 5) * 2100);
            
            // HX711 outputs 24-bit two's complement. 
            if (rawValue < 0) {
                rawValue = (1 << 24) + rawValue;
            }

            this.currentData = rawValue & 0xFFFFFF; // Ensure 24 bits
            this.pulseCount = 0;
            this.pin('DT').write(0); // Pull DT low to indicate data is ready
            this.nextSampleTime = this.time + 100_000; // Schedule next sample
        }

        const sck = this.pin('SCK').read();

        // Rising edge of SCK -> Shift out bit
        if (sck === 1 && this.lastSck === 0) {
            this.pulseCount++;
            
            if (this.pulseCount <= 24) {
                // Shift out MSB first
                const bit = (this.currentData >> (24 - this.pulseCount)) & 1;
                this.pin('DT').write(bit);
            } else {
                // Pulses 25, 26, 27 pull DT high
                this.pin('DT').write(1);
            }
        }

        this.lastSck = sck;
    }

    // 12.4 v2: numeric UI state for SAB slot {f0: weight} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {weight: Number((this as any).load ?? 0)},
            i: {},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        {
const vccConnected = connections.some((c: any) => c.pinId === "VCC");
        const gndConnected = connections.some((c: any) => c.pinId === "GND");
        if (!vccConnected || !gndConnected) {
            return "HX711 requires both VCC and GND to be connected.";
        }
        return null;
        }

        /* --- next rule --- */
        {
const dtConnected = connections.some((c: any) => c.pinId === "DT");
        const sckConnected = connections.some((c: any) => c.pinId === "SCK");
        if (!dtConnected || !sckConnected) {
            return "HX711 requires both DT and SCK pins to be connected for data transmission.";
        }
        return null;
        }
}
}
