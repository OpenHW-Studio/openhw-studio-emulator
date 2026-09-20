import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';

export class HC165Logic extends BaseComponent {
    private cpLast = false;
    private plLast = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            shiftReg: 0,
        };
    }

    onPinStateChange(pinId: string, isHigh: boolean, _cpuCycles: number): void {
        const pin = pinId.toLowerCase();

        if (pin === 'pl') {
            this.plLast = isHigh;
            if (!isHigh) {
                // Sampling (PL low)
                let val = 0;
                for (let i = 0; i < 8; i++) {
                    const dHigh = this.getPinVoltage(`d${i}`) > 0.5;
                    if (dHigh) val |= (1 << i);
                }
                this.state.shiftReg = val;
                this.updateOutputs();
                this.stateChanged = true;
            }
        } else if (pin === 'cp') {
            const rising = isHigh && !this.cpLast;
            this.cpLast = isHigh;

            if (rising) {
                const plHigh = this.getPinVoltage('pl') > 0.5;
                const ceLow = this.getPinVoltage('ce') < 0.5;

                if (plHigh && ceLow) {
                    // Shifting
                    const dsBit = this.getPinVoltage('ds') > 0.5 ? 1 : 0;
                    this.state.shiftReg = ((this.state.shiftReg << 1) | dsBit) & 0xFF;
                    this.updateOutputs();
                    this.stateChanged = true;
                }
            }
        } else if (pin === 'ce') {
            // Clock enable is active low, its level is checked during CP rising edge
        } else if (pin.startsWith('d') && pin.length === 2) {
            const plHigh = this.getPinVoltage('pl') > 0.5;
            if (!plHigh) {
                // If PL is low, input changes immediately affect the register
                let val = 0;
                for (let i = 0; i < 8; i++) {
                    const dHigh = this.getPinVoltage(`d${i}`) > 0.5;
                    if (dHigh) val |= (1 << i);
                }
                this.state.shiftReg = val;
                this.updateOutputs();
                this.stateChanged = true;
            }
        }
    }

    private updateOutputs(): void {
        const q7 = (this.state.shiftReg >> 7) & 0x01;
        this.setPinVoltage('q7', q7 ? 5.0 : 0.0);
        this.setPinVoltage('q7n', q7 ? 0.0 : 5.0);
    }

    getSyncState() {
        return { ...this.state };
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: loaded} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {loaded: (s.loaded ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        {
const ceConnected = graph.get(`${component.id}.ce`);
        if (!ceConnected || ceConnected.length === 0) {
            return createValidationIssue({
                ruleId: 'hc165-floating-ce',
                severity: 'warn',
                message: `⚠️ [Shift Register ${component.id}] Warning: Clock Enable (CE) pin is floating. It should be tied to GND to enable shifting, or driven by the MCU.`,
                compIds: [component.id],
                remediation: 'Tie CE to GND or drive it from a control pin.',
                autoFix: true,
            });
        }
        return null;
        }

        /* --- next rule --- */
        {
const plConnected = graph.get(`${component.id}.pl`);
        if (!plConnected || plConnected.length === 0) {
            return createValidationIssue({
                ruleId: 'hc165-floating-pl',
                severity: 'warn',
                message: `⚠️ [Shift Register ${component.id}] Warning: Parallel Load (PL) pin is floating. It should be driven by the MCU to control when data is latched.`,
                compIds: [component.id],
                remediation: 'Drive PL from a control pin (pulse LOW to load).',
                autoFix: false,
            });
        }
        return null;
        }
}
}
