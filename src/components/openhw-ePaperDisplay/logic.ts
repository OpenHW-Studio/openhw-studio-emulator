import { BaseComponent } from '../BaseComponent';

export class EPaperLogic extends BaseComponent {
    private dcHigh = false;
    private csHigh = true;
    private currentCommand = 0;

    // Buffer for 296x128 pixels (1 bit per pixel) = 4736 bytes
    private vram = new Uint8Array(4736);
    private vramDirty = false;
    private lastSync = 0;
    private powerOn = true;
    
    // Command parsing state
    private isDataMode = false;
    private ramPointer = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.vram.fill(255); // initialize to white (all 1s)
        this.state = { vram: this.vram, powerOn: true, t: Date.now() };
    }

    update(cpuCycles: number) {
        const now = Date.now();
        const vcc = this.getPinVoltage('VCC');
        const newPower = vcc > 2.0;

        if (newPower !== this.powerOn) {
            this.powerOn = newPower;
            this.stateChanged = true;
        }

        if (this.vramDirty || (now - this.lastSync > 100)) {
            this.lastSync = now;
            this.vramDirty = false;
            this.stateChanged = true;
            this.setState({
                vram: new Uint8Array(this.vram),
                powerOn: this.powerOn,
                t: now
            });
        }
        
        // Always report not busy for simple simulation
        this.setPinVoltage('BUSY', 0);
    }

    onPinStateChange(pinId: string, isHigh: boolean) {
        if (pinId === 'DC') this.dcHigh = isHigh;
        else if (pinId === 'CS') this.csHigh = isHigh;
        else if (pinId === 'RST' && !isHigh) {
            this.ramPointer = 0;
            this.vram.fill(255); // Reset to white
            this.vramDirty = true;
        }
    }

    onSPIByte(data: number) {
        if (this.csHigh || !this.powerOn) return 0xFF;

        if (!this.dcHigh) {
            this.currentCommand = data;
            if (data === 0x24) { // RAM write command (standard for many e-papers)
                this.ramPointer = 0;
            }
        } else {
            if (this.currentCommand === 0x24) {
                if (this.ramPointer < this.vram.length) {
                    this.vram[this.ramPointer++] = data;
                    this.vramDirty = true;
                }
            }
        }
        return 0x00;
    }

    getSyncState() {
        return {
            vram: this.vram,
            powerOn: this.powerOn,
            t: Date.now()
        };
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            powerStatus: this.powerOn ? "On" : "Off",
            resolution: "296x128",
            ramPointer: this.ramPointer
        });
    }
}
