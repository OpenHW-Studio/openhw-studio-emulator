import { BaseComponent } from '../BaseComponent';
import { I2CProtocol } from '../../protocol-handlers/index';

export class PCA9865Logic extends I2CProtocol {
    private pwmRegs = new Uint8Array(256);
    private i2cAddress = 0x40;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {};
        const addrAttr = manifest.attrs?.i2cAddress || manifest.attrs?.i2c_address;
        if (addrAttr) {
            this.i2cAddress = (typeof addrAttr === 'number') ? addrAttr : parseInt(addrAttr, 16);
        }
    }

    onI2CStart(address: number, read: boolean): boolean {
        const addr7 = (address > 0x7F) ? (address >> 1) : address;
        return addr7 === this.i2cAddress;
    }

    onI2CWriteRegister(reg: number, data: number[]): void {
        for (let i = 0; i < data.length; i++) {
            this.pwmRegs[(reg + i) & 0xFF] = data[i];
        }
        this.updatePWMOutputs();
    }

    onI2CReadRequest(reg: number, count: number): number[] {
        const result: number[] = [];
        for (let i = 0; i < count; i++) {
            result.push(this.pwmRegs[(reg + i) & 0xFF]);
        }
        return result;
    }

    private updatePWMOutputs() {
        for (let ch = 0; ch < 16; ch++) {
            const base = 0x06 + 4 * ch;
            const onVal = this.pwmRegs[base] | ((this.pwmRegs[base + 1] & 0x0F) << 8);
            const offVal = this.pwmRegs[base + 2] | ((this.pwmRegs[base + 3] & 0x0F) << 8);

            let duty = (offVal - onVal) / 4096.0;
            if (duty < 0) duty += 1.0;

            // Full ON and Full OFF logic bit 4
            if (this.pwmRegs[base + 1] & 0x10) duty = 1.0;
            else if (this.pwmRegs[base + 3] & 0x10) duty = 0.0;

            this.setPinVoltage(`S${ch}`, 5.0 * duty);
        }
    }

    onCustomTelemetry() {
        const dutyCycles: Record<number, number> = {};
        let activePWMChannels = 0;

        for (let ch = 0; ch < 16; ch++) {
            const base = 0x06 + 4 * ch;
            const onVal = this.pwmRegs[base] | ((this.pwmRegs[base + 1] & 0x0F) << 8);
            const offVal = this.pwmRegs[base + 2] | ((this.pwmRegs[base + 3] & 0x0F) << 8);

            let duty = (offVal - onVal) / 4096.0;
            if (duty < 0) duty += 1.0;
            if (this.pwmRegs[base + 1] & 0x10) duty = 1.0;
            else if (this.pwmRegs[base + 3] & 0x10) duty = 0.0;

            dutyCycles[ch] = Number((duty * 100).toFixed(1));
            if (duty > 0.01 && duty < 0.99) activePWMChannels++;
        }

        this.setCustomTelemetry({
            i2cAddress: `0x${this.i2cAddress.toString(16).padStart(2, '0')}`,
            activePWMChannels: activePWMChannels,
            dutyCycles: dutyCycles,
            resolution: '8-bit GPIO expander',
        });
    }
}
