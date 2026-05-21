import { I2SProtocol } from "../../protocol-handlers/i2s-device";

export class Logic extends I2SProtocol {
    constructor(id: string, manifest: any) {
        super(id, manifest);
    }

    override onI2SFrame(channel: 0 | 1, sample: number, bitsPerFrame: number): void {
        super.onI2SFrame(channel, sample, bitsPerFrame);
        
        // Also drive the analog pins for visual/voltage logic
        const voltage = (sample / 2147483648) * 1.65 + 1.65; // centered at 1.65V (half of 3.3V)
        if (channel === 0) {
            this.setPinVoltage('OUTL', voltage);
        } else {
            this.setPinVoltage('OUTR', voltage);
        }
    }
}
