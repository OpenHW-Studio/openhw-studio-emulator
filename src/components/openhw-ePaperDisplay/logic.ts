import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';

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

    // 12.4 v2: numeric UI state for SAB slot {i0: powerOn} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {powerOn: (s.powerOn ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const pins = validator.getComponentPins(component);
        const vcc = pins.find((p: string) => p.includes('VCC'));
        const gnd = pins.find((p: string) => p.includes('GND'));
        const din = pins.find((p: string) => p.includes('DIN'));
        const clk = pins.find((p: string) => p.includes('CLK'));
        const cs = pins.find((p: string) => p.includes('CS'));
        const dc = pins.find((p: string) => p.includes('DC'));
        const issues = [];

        if (vcc) {
            const node = `${component.id}.${vcc}`;
            if (((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length === 0) {
                issues.push(createValidationIssue({
                    ruleId: 'epaper-interface-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Power (VCC) is not connected.`,
                    compIds: [component.id],
                    remediation: 'Connect VCC to a 3.3V power source.',
                    autoFix: true,
                }));
            }
        }

        if (gnd) {
            const node = `${component.id}.${gnd}`;
            if (((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length === 0) {
                issues.push(createValidationIssue({
                    ruleId: 'epaper-interface-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Ground (GND) is not connected.`,
                    compIds: [component.id],
                    remediation: 'Connect GND to the common ground rail.',
                    autoFix: true,
                }));
            }
        }

        if (din && ((validator ? validator.getNeighbors(`${component.id}.${din}`) : (graph.get(`${component.id}.${din}`) || []))).length === 0) {
            issues.push(createValidationIssue({
                ruleId: 'epaper-interface-check',
                severity: 'warn',
                message: `⚠️ [${component.type} ${component.id}] DIN (MOSI) pin is floating.`,
                compIds: [component.id],
                remediation: 'Connect DIN to the MCU SPI MOSI pin.',
                autoFix: true,
            }));
        }

        if (clk && ((validator ? validator.getNeighbors(`${component.id}.${clk}`) : (graph.get(`${component.id}.${clk}`) || []))).length === 0) {
            issues.push(createValidationIssue({
                ruleId: 'epaper-interface-check',
                severity: 'warn',
                message: `⚠️ [${component.type} ${component.id}] CLK (SCK) pin is floating.`,
                compIds: [component.id],
                remediation: 'Connect CLK to the MCU SPI Clock pin.',
                autoFix: true,
            }));
        }

        if (cs && ((validator ? validator.getNeighbors(`${component.id}.${cs}`) : (graph.get(`${component.id}.${cs}`) || []))).length === 0) {
            issues.push(createValidationIssue({
                ruleId: 'epaper-interface-check',
                severity: 'warn',
                message: `⚠️ [${component.type} ${component.id}] CS (Chip Select) pin is floating.`,
                compIds: [component.id],
                remediation: 'Connect CS to an MCU digital pin.',
                autoFix: true,
            }));
        }

        if (dc && ((validator ? validator.getNeighbors(`${component.id}.${dc}`) : (graph.get(`${component.id}.${dc}`) || []))).length === 0) {
            issues.push(createValidationIssue({
                ruleId: 'epaper-interface-check',
                severity: 'warn',
                message: `⚠️ [${component.type} ${component.id}] DC (Data/Command) pin is floating.`,
                compIds: [component.id],
                remediation: 'Connect DC to an MCU digital pin.',
                autoFix: true,
            }));
        }

        return issues.length > 0 ? issues : null;
    }
}
