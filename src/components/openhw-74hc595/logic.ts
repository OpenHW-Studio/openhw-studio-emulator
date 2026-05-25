import { BaseComponent } from '../BaseComponent';

export class HC595Logic extends BaseComponent {
    private srclkLast = false;
    private rclkLast  = false;
    private oeLast    = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            shiftReg:    0,
            storageReg:  0,
            outputs:     0,
        };
    }

    onPinStateChange(pinId: string, isHigh: boolean, _cpuCycles: number): void {
        const pin = pinId.toLowerCase();

        switch (pin) {
            case 'srclr':
                if (!isHigh) {
                    this.state.shiftReg = 0;
                    this.setPinVoltage('q7s', 0);
                    this.stateChanged = true;
                }
                break;
            case 'oe':
                if (this.oeLast !== isHigh) {
                    this.oeLast = isHigh;
                    this.updateOutputPins();
                }
                break;
            case 'srclk': {
                const rising = isHigh && !this.srclkLast;
                this.srclkLast = isHigh;
                if (rising) {
                    const serBit = this.getPinVoltage('ser') > 0.5 ? 1 : 0;
                    const q7out  = (this.state.shiftReg >> 7) & 0x01;
                    this.state.shiftReg = ((this.state.shiftReg << 1) | serBit) & 0xFF;
                    this.setPinVoltage('q7s', q7out ? 5.0 : 0.0);
                    this.stateChanged = true;
                }
                break;
            }
            case 'rclk': {
                const rising = isHigh && !this.rclkLast;
                this.rclkLast = isHigh;
                if (rising) {
                    this.state.storageReg = this.state.shiftReg;
                    this.updateOutputPins();
                }
                break;
            }
        }
    }

    onSPIByte(data: number): number {
        const q7sByte = this.state.shiftReg & 0xFF;
        this.state.shiftReg = data & 0xFF;
        this.setPinVoltage('q7s', (q7sByte >> 7) & 0x01 ? 5.0 : 0.0);
        this.stateChanged = true;
        return q7sByte;
    }

    private updateOutputPins(): void {
        const oeEnabled = this.getPinVoltage('oe') < 0.5;
        const sr = oeEnabled ? this.state.storageReg : 0;
        this.state.outputs = sr;

        for (let i = 0; i < 8; i++) {
            this.setPinVoltage(`q${i}`, (sr >> i) & 0x01 ? 5.0 : 0.0);
        }
        this.stateChanged = true;
    }

    getSyncState() {
        return { ...this.state };
    }
}
