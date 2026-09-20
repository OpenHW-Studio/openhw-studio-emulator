import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';

export class NPNTransistorLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {};
    }

    onPinStateChange() {
        const vb = this.getPinVoltage('B');
        const vc = this.getPinVoltage('C');
        const ve = this.getPinVoltage('E');

        if (vb > 0.6) {
            // ON: transistor conducts C→E (saturation mode)
            // Pull Collector toward Emitter (low-side switch behavior)
            this.setPinVoltage('C', Math.min(vc, ve + 0.2));
            // Pull Emitter toward Collector
            this.setPinVoltage('E', Math.max(ve, vc - 0.2));
        } else {
            // OFF: high impedance, Collector floats to load voltage
            this.setPinVoltage('E', 0);
            this.setPinVoltage('C', 5.0);
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        const vb = this.getPinVoltage('B');
        const vc = this.getPinVoltage('C');
        const ve = this.getPinVoltage('E');

        if (vb > 0.6) {
            this.setPinVoltage('C', Math.min(vc, ve + 0.2));
            this.setPinVoltage('E', Math.max(ve, vc - 0.2));
        } else {
            this.setPinVoltage('E', 0);
            this.setPinVoltage('C', 5.0);
        }
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: conducting} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {conducting: (s.conducting ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const b = `${component.id}.B`;
        const c = `${component.id}.C`;
        const e = `${component.id}.E`;
        const issues = [];

        const hasB = ((validator ? validator.getNeighbors(b) : (graph.get(b) || []))).length > 0;
        const hasC = ((validator ? validator.getNeighbors(c) : (graph.get(c) || []))).length > 0;
        const hasE = ((validator ? validator.getNeighbors(e) : (graph.get(e) || []))).length > 0;

        if (hasB && hasC && hasE) {
            const vB = validator.calculateVoltageAtNode(b);
            const vC = validator.calculateVoltageAtNode(c);
            const vE = validator.calculateVoltageAtNode(e);

            if (vB > vC + 0.5 && vC > 0.1) {
                issues.push(createValidationIssue({
                    ruleId: 'npn-transistor-connection-check',
                    severity: 'warn',
                    message: `⚠️ [NPN ${component.id}] Potential Over-Saturation: Base voltage (${vB.toFixed(1)}V) is higher than Collector (${vC.toFixed(1)}V). Ensure you have a current-limiting resistor on the Base.`,
                    compIds: [component.id],
                    remediation: 'Add a base resistor to limit drive current.',
                    autoFix: true,
                }));
            }
            if (vE > vB && vE > 0.1) {
                issues.push(createValidationIssue({
                    ruleId: 'npn-transistor-connection-check',
                    severity: 'warn',
                    message: `⚠️ [NPN ${component.id}] Reverse Bias: Emitter voltage is higher than Base. The transistor will not switch correctly in this configuration.`,
                    compIds: [component.id],
                    remediation: 'Rewire the transistor so the emitter is at the lower potential.',
                    autoFix: true,
                }));
            }
        } else if (hasB || hasC || hasE) {
            issues.push(createValidationIssue({
                ruleId: 'npn-transistor-connection-check',
                severity: 'warn',
                message: `⚠️ [NPN ${component.id}] Warning: Transistor is only partially connected. All three pins (C, B, E) usually need to be wired.`,
                compIds: [component.id],
                remediation: 'Wire all three transistor pins.',
                autoFix: true,
            }));
        }

        return issues.length > 0 ? issues : null;
    }
}
