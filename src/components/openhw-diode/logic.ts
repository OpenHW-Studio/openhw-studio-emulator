import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';

export class DiodeLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {};
    }

    getMnaPins() { return ['A', 'C']; }
    getConductance() {
        const va = this.getPinVoltage('A');
        const vc = this.getPinVoltage('C');
        return (va > vc + 0.6) ? 100 : 1e-9;
    }

    onPinStateChange() {
        const va = this.getPinVoltage('A');
        const vc = this.getPinVoltage('C');

        if (va > vc + 0.6) {
            // Forward biased
            this.setPinVoltage('C', Math.max(0, va - 0.7));
        } else {
            // Reverse biased - no pass through
            // Do not drive pin active low, let it float or stay at its own potential
        }
    }

    // 12.4 v2: numeric UI state for SAB slot {f0: voltageDrop} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {voltageDrop: Number(s.voltageDrop ?? 0)},
            i: {},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const anodeNode = `${component.id}.A`;
        const cathodeNode = `${component.id}.K`;

        const aConns = graph.get(anodeNode) || [];
        const kConns = graph.get(cathodeNode) || [];

        if (aConns.length === 0 && kConns.length === 0) {
            return createValidationIssue({
                ruleId: 'diode-connection-check',
                severity: 'warn',
                message: `⚠️ [Diode ${component.id}] Warning: Neither Anode nor Cathode is connected.`,
                compIds: [component.id],
                remediation: 'Wire the diode into a circuit with the correct polarity.',
                autoFix: true,
            });
        }

        const vA = validator.calculateVoltageAtNode(anodeNode);
        const vK = validator.calculateVoltageAtNode(cathodeNode);

        if (vK > vA + 0.1 && aConns.length > 0 && kConns.length > 0) {
            return createValidationIssue({
                ruleId: 'diode-connection-check',
                severity: 'warn',
                message: `⚠️ [Diode ${component.id}] Reverse Bias: Cathode voltage (${vK.toFixed(1)}V) is higher than Anode (${vA.toFixed(1)}V). Diode will block current.`,
                compIds: [component.id],
                remediation: 'Flip the diode orientation or reverse the applied polarity.',
                autoFix: false,
            });
        }

        return null;
    }
}
