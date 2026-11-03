import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';
import { I2CProtocol } from '../../protocol-handlers/index';

export class PCA9685Logic extends I2CProtocol {
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
        // Registers structure:
        // LED0_ON_L (0x06), LED0_ON_H (0x07), LED0_OFF_L (0x08), LED0_OFF_H (0x09) ...
        // We evaluate an equivalent duty cycle mapped to voltage for simple emulation.
        // A PCA9685 channel has 12-bit resolution.

        for (let ch = 0; ch < 16; ch++) {
            const base = 0x06 + 4 * ch;
            const onVal = this.pwmRegs[base] | ((this.pwmRegs[base + 1] & 0x0F) << 8);
            const offVal = this.pwmRegs[base + 2] | ((this.pwmRegs[base + 3] & 0x0F) << 8);

            // Basic duty cycle calculation: (offVal - onVal) / 4096
            let duty = (offVal - onVal) / 4096.0;
            if (duty < 0) duty += 1.0;

            // Full ON and Full OFF logic bit 4
            if (this.pwmRegs[base + 1] & 0x10) duty = 1.0;
            else if (this.pwmRegs[base + 3] & 0x10) duty = 0.0;

            // Output simulated PWM as a continuous analog voltage between 0-5V to drive components
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
            resolution: '12-bit',
        });
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: enabled} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {enabled: (s.enabled ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const pins = validator.getComponentPins(component);
        const sda = pins.find((p: string) => p.includes('SDA'));
        const scl = pins.find((p: string) => p.includes('SCL'));
        const vcc = pins.find((p: string) => p.includes('VCC') || p.includes('V+'));
        const gnd = pins.find((p: string) => p.includes('GND'));
        const issues = [];

        if (vcc) {
            const node = `${component.id}.${vcc}`;
            if (((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length === 0) {
                issues.push(createValidationIssue({
                    ruleId: 'pca9685-i2c-interface-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Logic Power (VCC) is not connected.`,
                    compIds: [component.id],
                    remediation: 'Connect VCC to the logic supply rail.',
                    autoFix: true,
                }));
            } else if (!validator.hasResistivePathToSupply(node)) {
                issues.push(createValidationIssue({
                    ruleId: 'pca9685-i2c-interface-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Logic Power (VCC) is connected but does not reach a valid power supply rail.`,
                    compIds: [component.id],
                    remediation: 'Ensure VCC path connects to a 3.3V/5V power source.',
                }));
            }
        }

        if (gnd) {
            const node = `${component.id}.${gnd}`;
            if (((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length === 0) {
                issues.push(createValidationIssue({
                    ruleId: 'pca9685-i2c-interface-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Ground (GND) is not connected.`,
                    compIds: [component.id],
                    remediation: 'Connect GND to the common ground rail.',
                    autoFix: true,
                }));
            } else {
                const gndSources = validator.collectVoltageSources(node);
                if (!gndSources.some((s: any) => s.voltage === 0)) {
                    issues.push(createValidationIssue({
                        ruleId: 'pca9685-i2c-interface-check',
                        severity: 'warn',
                        message: `⚠️ [${component.type} ${component.id}] Ground (GND) is connected but does not reach a valid ground rail (GND).`,
                        compIds: [component.id],
                        remediation: 'Ensure GND path connects to a valid ground rail.',
                    }));
                }
            }
        }
        if (sda && ((validator ? validator.getNeighbors(`${component.id}.${sda}`) : (graph.get(`${component.id}.${sda}`) || []))).length === 0) {
            issues.push(createValidationIssue({
                ruleId: 'pca9685-i2c-interface-check',
                severity: 'warn',
                message: `⚠️ [${component.type} ${component.id}] I2C SDA pin is floating.`,
                compIds: [component.id],
                remediation: 'Connect SDA to the MCU I2C data pin.',
                autoFix: true,
            }));
        }
        if (scl && ((validator ? validator.getNeighbors(`${component.id}.${scl}`) : (graph.get(`${component.id}.${scl}`) || []))).length === 0) {
            issues.push(createValidationIssue({
                ruleId: 'pca9685-i2c-interface-check',
                severity: 'warn',
                message: `⚠️ [${component.type} ${component.id}] I2C SCL pin is floating.`,
                compIds: [component.id],
                remediation: 'Connect SCL to the MCU I2C clock pin.',
                autoFix: true,
            }));
        }

        return issues.length > 0 ? issues : null;
    }
}
