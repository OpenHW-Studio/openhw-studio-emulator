import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';
import { I2CProtocol } from '../../protocol-handlers/index';
import { HD44780Controller } from '../../protocol-handlers/hd44780-controller';

export class Lcd1602I2CLogic extends I2CProtocol {
    private hd44780 = new HD44780Controller(2, 16);
    private lastByte = 0;
    private pendingSync = false;
    private lastFlushMs = 0;
    private lastI2CActivityMs = 0;
    private lastI2CActivityCycles = 0; // cycle-based debounce (no Date.now in tick)
    private simCycles = 0;
    private lastFlushCycles = 0;

    private static readonly FLUSH_INTERVAL_MS = 40;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { ...this.state, ...this.hd44780.getState() };
    }

    onI2CByte(addr: number, value: number) {
        this.lastByte = this.hd44780.feedI2CByte(value, this.lastByte);
        if (this.hd44780.stateChanged) {
            this.pendingSync = true;
            this.lastI2CActivityMs = Date.now(); // legacy wall stamp (non-tick)
            this.lastI2CActivityCycles = this.simCycles;
            this.hd44780.clearChanged();
        }
        return true;
    }

    update(cpuCycles: number, wires: any, allComponents: any) {
        if (!this.pendingSync) return;
        this.simCycles = cpuCycles;

        // Debounce in cycles (16MHz): 40ms silence = 640k cycles, 200ms starve = 3.2M.
        const idleCycles = cpuCycles - this.lastI2CActivityCycles;
        const isIdle = idleCycles >= 640000;
        const isStarved = this.lastFlushCycles > 0 && (cpuCycles - this.lastFlushCycles) >= 3200000;

        if (!isIdle && !isStarved) {
            return;
        }

        this.lastFlushCycles = cpuCycles;
        this.lastFlushMs = Math.floor(cpuCycles / 16000);
        this.pendingSync = false;
        this.setState({ ...this.state, ...this.hd44780.getState() });
    }

    onCustomTelemetry() {
        const textContent = this.hd44780.getLines().map(l => l.trimEnd()).join('\n').trimEnd();
        this.setCustomTelemetry({
            i2cAddress: `0x${this.getI2CAddress().toString(16).toUpperCase()}`,
            textContent: textContent || '<empty>',
            backlight: this.hd44780.getBacklight(),
            lineCount: 2,
            charsPerLine: 16,
        });
    }

    getSyncState() {
        return { ...this.state };
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: backlight} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {backlight: (s.backlight ? 1 : 0)},
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
                    ruleId: 'lcd1602-i2c-interface-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Power (VCC) is not connected.`,
                    compIds: [component.id],
                    remediation: 'Connect VCC to the correct supply rail.',
                    autoFix: true,
                }));
            } else if (!validator.hasResistivePathToSupply(node)) {
                issues.push(createValidationIssue({
                    ruleId: 'lcd1602-i2c-interface-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Power (VCC) is connected but does not reach a valid power supply rail.`,
                    compIds: [component.id],
                    remediation: 'Ensure VCC path connects to a 5V/3.3V power source.',
                }));
            }
        }

        if (gnd) {
            const node = `${component.id}.${gnd}`;
            if (((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length === 0) {
                issues.push(createValidationIssue({
                    ruleId: 'lcd1602-i2c-interface-check',
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
                        ruleId: 'lcd1602-i2c-interface-check',
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
                ruleId: 'lcd1602-i2c-interface-check',
                severity: 'warn',
                message: `⚠️ [${component.type} ${component.id}] I2C SDA pin is floating.`,
                compIds: [component.id],
                remediation: 'Connect SDA to the MCU I2C data pin.',
                autoFix: true,
            }));
        }
        if (scl && ((validator ? validator.getNeighbors(`${component.id}.${scl}`) : (graph.get(`${component.id}.${scl}`) || []))).length === 0) {
            issues.push(createValidationIssue({
                ruleId: 'lcd1602-i2c-interface-check',
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
