import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';

export class L293DLogic extends BaseComponent {
    private pinData: Record<string, { lastState: boolean, lastCycle: number, highCycles: number }> = {};
    private lastUpdateCycle = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {};
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        if (!this.pinData[pinId]) {
            this.pinData[pinId] = { lastState: false, lastCycle: cpuCycles, highCycles: 0 };
        }
        const data = this.pinData[pinId];
        if (data.lastState) {
            data.highCycles += (cpuCycles - data.lastCycle);
        }
        data.lastState = isHigh;
        data.lastCycle = cpuCycles;

        // Immediate logic propagation to support fast-switching inputs (like Stepper motors)
        // This prevents aliasing of fast pulses between update() cycles
        if (pinId === 'IN1' || pinId === 'IN2') {
            const en12 = this.getPinVoltage('EN1,2');
            if (en12 > 0.5) { // If enabled
                if (pinId === 'IN1') this.setPinVoltage('OUT1', isHigh ? en12 : 0);
                if (pinId === 'IN2') this.setPinVoltage('OUT2', isHigh ? en12 : 0);
            }
        } else if (pinId === 'IN3' || pinId === 'IN4') {
            const en34 = this.getPinVoltage('EN3,4');
            if (en34 > 0.5) { // If enabled
                if (pinId === 'IN3') this.setPinVoltage('OUT3', isHigh ? en34 : 0);
                if (pinId === 'IN4') this.setPinVoltage('OUT4', isHigh ? en34 : 0);
            }
        }
    }

    private getAverageVoltage(pinId: string, currentCycles: number, elapsedCycles: number): number {
        const data = this.pinData[pinId];
        if (!data) return this.getPinVoltage(pinId);

        let highCyclesToCount = data.highCycles;
        if (data.lastState) {
            highCyclesToCount += (currentCycles - data.lastCycle);
        }

        data.highCycles = 0;
        data.lastCycle = currentCycles;

        if (elapsedCycles <= 0) return this.getPinVoltage(pinId);

        let dutyCycle = highCyclesToCount / elapsedCycles;
        dutyCycle = Math.max(0, Math.min(1, dutyCycle));

        return dutyCycle * 5.0; // Assume 5V logic range
    }

    update(time: number, wires: any[], instances: BaseComponent[]) {
        super.update(time, wires, instances);

        const elapsedCycles = time - this.lastUpdateCycle;
        this.lastUpdateCycle = time;

        if (elapsedCycles <= 0) return;

        // Bridge 1 (Left Side)
        const en12 = this.getAverageVoltage('EN1,2', time, elapsedCycles);
        const in1 = this.getPinVoltage('IN1') > 2.5;
        const in2 = this.getPinVoltage('IN2') > 2.5;

        if (en12 > 0.5) {
            this.setPinVoltage('OUT1', in1 ? en12 : 0);
            this.setPinVoltage('OUT2', in2 ? en12 : 0);
        } else {
            this.setPinVoltage('OUT1', 0);
            this.setPinVoltage('OUT2', 0);
        }

        // Bridge 2 (Right Side)
        const en34 = this.getAverageVoltage('EN3,4', time, elapsedCycles);
        const in3 = this.getPinVoltage('IN3') > 2.5;
        const in4 = this.getPinVoltage('IN4') > 2.5;

        if (en34 > 0.5) {
            this.setPinVoltage('OUT3', in3 ? en34 : 0);
            this.setPinVoltage('OUT4', in4 ? en34 : 0);
        } else {
            this.setPinVoltage('OUT3', 0);
            this.setPinVoltage('OUT4', 0);
        }

        this.stateChanged = true;
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            active: (this.getPinVoltage('EN1,2') > 2.5 || this.getPinVoltage('EN3,4') > 2.5) ? "Yes" : "No"
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
        const vcc1 = `${component.id}.VCC1`;
        const vcc2 = `${component.id}.VCC2`;
        const gndCandidates = [`${component.id}.GND1`, `${component.id}.GND2`, `${component.id}.GND3`, `${component.id}.GND4`, `${component.id}.GND`];
        const gnd = gndCandidates.find(node => ((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length > 0) || gndCandidates[0];
        const issues = [];

        const v1 = validator.calculateVoltageAtNode(vcc1);
        const v2 = validator.calculateVoltageAtNode(vcc2);

        if (v1 < 4.5) {
            issues.push(createValidationIssue({
                ruleId: 'l293d-dual-power-supply-check',
                severity: 'warn',
                message: `⚠️ [L293D ${component.id}] Logic Power (VCC1) is missing or too low. Motor driver will not function.`,
                compIds: [component.id],
                remediation: 'Connect VCC1 to the correct logic supply.',
                autoFix: true,
            }));
        }
        if (v2 < v1) {
            issues.push(createValidationIssue({
                ruleId: 'l293d-dual-power-supply-check',
                severity: 'warn',
                message: `⚠️ [L293D ${component.id}] Warning: Motor Power (VCC2) is lower than Logic Power. Motors may be underpowered or stall.`,
                compIds: [component.id],
                remediation: 'Raise the motor supply rail above the logic rail.',
                autoFix: true,
            }));
        }
        if (((validator ? validator.getNeighbors(gnd) : (graph.get(gnd) || []))).length === 0) {
            issues.push(createValidationIssue({
                ruleId: 'l293d-dual-power-supply-check',
                severity: 'warn',
                message: `⚠️ [L293D ${component.id}] Ground connection is missing.`,
                compIds: [component.id],
                remediation: 'Connect the L293D ground pin to the common ground rail.',
                autoFix: true,
            }));
        }

        return issues.length > 0 ? issues : null;
    }
}
