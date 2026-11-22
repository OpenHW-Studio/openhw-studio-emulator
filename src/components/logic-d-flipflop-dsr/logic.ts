import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';

export class DFlipFlopDsrLogic extends BaseComponent {
    private prevClk: boolean = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { d: false, clk: false, s: false, r: false, q: false, qbar: true };
    }

    update(time: number, wires: any[], instances: BaseComponent[]) {
        super.update(time, wires, instances);

        const d = this.getPinVoltage('D') >= 2.5;
        const clk = this.getPinVoltage('CLK') >= 2.5;
        const s = this.getPinVoltage('S') >= 2.5;
        const r = this.getPinVoltage('R') >= 2.5;
        let q = this.state.q;
        let qbar = this.state.qbar;

        // Asynchronous reset/set evaluation
        if (r && s) {
            // Invalid state typically forces both to LOW in commercial ICs, or Reset wins.
            // Let's make Reset win for safety/predictability.
            q = false;
            qbar = true;
        } else if (r) {
            q = false;
            qbar = true;
        } else if (s) {
            q = true;
            qbar = false;
        } else if (clk && !this.prevClk) {
            // Rising edge detection
            q = d;
            qbar = !d;
        }
        this.prevClk = clk;

        if (this.state.d !== d || this.state.clk !== clk || this.state.s !== s || this.state.r !== r || 
            this.state.q !== q || this.state.qbar !== qbar) {
            this.state.d = d;
            this.state.clk = clk;
            this.state.s = s;
            this.state.r = r;
            this.state.q = q;
            this.state.qbar = qbar;
            this.stateChanged = true;
        }

        // Propagate outputs
        this.propagatePin('Q', q ? 5.0 : 0.0, wires, instances);
        this.propagatePin('Qbar', qbar ? 5.0 : 0.0, wires, instances);
    }

    private propagatePin(pinId: string, voltage: number, wires: any[], instances: BaseComponent[]) {
        if (!this.pins[pinId]) this.pins[pinId] = { voltage: 0, mode: 'OUTPUT' };
        this.pins[pinId].voltage = voltage;
        const pinKey = `${this.id}:${pinId}`;
        const visited = new Set<string>();
        visited.add(pinKey);

        const propagate = (key: string, v: number) => {
            for (const w of wires) {
                const match = w.from === key || w.to === key;
                if (!match) continue;
                const otherKey = w.from === key ? w.to : w.from;
                if (visited.has(otherKey)) continue;
                visited.add(otherKey);

                const [compId, compPin] = otherKey.split(':');
                const inst = this.findInstance(instances, compId);
                if (!inst) continue;

                if (!inst.pins[compPin]) inst.pins[compPin] = { voltage: 0, mode: 'INPUT' };
                inst.setPinVoltage(compPin, v);

                if (inst.type === 'openhw-resistor') {
                    const otherPin = compPin === 'p1' ? 'p2' : 'p1';
                    inst.setPinVoltage(otherPin, v);
                    const forwardKey = `${compId}:${otherPin}`;
                    if (!visited.has(forwardKey)) {
                        visited.add(forwardKey);
                        propagate(forwardKey, v);
                    }
                }
            }
        };

        propagate(pinKey, voltage);
    }

    getPinVoltage(pinId: string): number {
        if (pinId === 'Q') return this.state.q ? 5.0 : 0.0;
        if (pinId === 'Qbar') return this.state.qbar ? 5.0 : 0.0;
        return super.getPinVoltage(pinId);
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: q, i1: qbar} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {q: (s.q ? 1 : 0), qbar: (s.qbar ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const pinD = graph.get(`${component.id}.D`);
        const pinClk = graph.get(`${component.id}.CLK`);
        const pinS = graph.get(`${component.id}.S`);
        const pinR = graph.get(`${component.id}.R`);
        const pinQ = graph.get(`${component.id}.Q`);

        if ((!pinD || pinD.length === 0) && (!pinClk || pinClk.length === 0) &&
            (!pinQ || pinQ.length === 0) && (!pinR || pinR.length === 0) && (!pinS || pinS.length === 0)) {
            return createValidationIssue({
                ruleId: 'logic-d-flipflop-dsr-connection-check',
                severity: 'warn',
                message: `⚠️ [D Flip-Flop (Set/Reset) ${component.id}] Warning: No pins are connected.`,
                compIds: [component.id],
                remediation: 'Wire the D, CLK, Q, S, and R pins as required by the design.',
                autoFix: true,
            });
        }
        return null;
    }
}
