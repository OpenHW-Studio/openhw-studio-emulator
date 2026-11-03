import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';

export class Mux2to1Logic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { d0High: false, d1High: false, selHigh: false, outputHigh: false };
    }

    update(time: number, wires: any[], instances: BaseComponent[]) {
        super.update(time, wires, instances);

        const d0High = this.getPinVoltage('D0') >= 2.5;
        const d1High = this.getPinVoltage('D1') >= 2.5;
        const selHigh = this.getPinVoltage('SEL') >= 2.5;
        const outputHigh = selHigh ? d1High : d0High;

        if (this.state.d0High !== d0High || this.state.d1High !== d1High ||
            this.state.selHigh !== selHigh || this.state.outputHigh !== outputHigh) {
            this.state.d0High = d0High;
            this.state.d1High = d1High;
            this.state.selHigh = selHigh;
            this.state.outputHigh = outputHigh;
            this.stateChanged = true;
        }

        const outVoltage = outputHigh ? 5.0 : 0.0;
        if (!this.pins['OUT']) this.pins['OUT'] = { voltage: 0, mode: 'OUTPUT' };
        this.pins['OUT'].voltage = outVoltage;
    }

    getPinVoltage(pinId: string): number {
        if (pinId === 'OUT') {
            return this.state.outputHigh ? 5.0 : 0.0;
        }
        return super.getPinVoltage(pinId);
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: outputHigh} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {outputHigh: (s.outputHigh ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const pinD0 = graph.get(`${component.id}.D0`);
        const pinD1 = graph.get(`${component.id}.D1`);
        const pinSel = graph.get(`${component.id}.SEL`);
        const pinOut = graph.get(`${component.id}.OUT`);

        if ((!pinD0 || pinD0.length === 0) && (!pinD1 || pinD1.length === 0) &&
            (!pinSel || pinSel.length === 0) && (!pinOut || pinOut.length === 0)) {
            return createValidationIssue({
                ruleId: 'logic-mux-2to1-connection-check',
                severity: 'warn',
                message: `⚠️ [MUX 2:1 ${component.id}] Warning: No pins are connected.`,
                compIds: [component.id],
                remediation: 'Wire the select, inputs, and output pins into the circuit.',
                autoFix: true,
            });
        }
        return null;
    }
}
