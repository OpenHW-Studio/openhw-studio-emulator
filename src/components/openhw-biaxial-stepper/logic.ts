import { BaseComponent } from '../BaseComponent';

export class BiaxialStepperLogic extends BaseComponent {
    private outerAngle = 0;
    private innerAngle = 0;
    private stepAngle = 1.8;

    private currentPhaseOuter = -1;
    private stepCountOuter = 0;

    private currentPhaseInner = -1;
    private stepCountInner = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        if (manifest.attrs && manifest.attrs.step_angle) {
            this.stepAngle = parseFloat(manifest.attrs.step_angle);
        }
        this.state = {
            outerAngle: this.outerAngle,
            innerAngle: this.innerAngle
        };
    }

    private processStepper(
        aPlus: boolean, aMinus: boolean, bPlus: boolean, bMinus: boolean,
        currentPhase: number, stepCount: number, currentAngle: number
    ): { newPhase: number, newStepCount: number, newAngle: number, changed: boolean } {
        let phaseA = 0;
        if (aPlus && !aMinus) phaseA = 1;
        else if (!aPlus && aMinus) phaseA = -1;

        let phaseB = 0;
        if (bPlus && !bMinus) phaseB = 1;
        else if (!bPlus && bMinus) phaseB = -1;

        let newPhaseVal = -1;
        if (phaseA === 1 && phaseB === 1) newPhaseVal = 0;
        else if (phaseA === -1 && phaseB === 1) newPhaseVal = 1;
        else if (phaseA === -1 && phaseB === -1) newPhaseVal = 2;
        else if (phaseA === 1 && phaseB === -1) newPhaseVal = 3;

        let changed = false;
        let newAngle = currentAngle;
        let newCount = stepCount;

        if (newPhaseVal !== -1) {
            if (currentPhase === -1) {
                currentPhase = newPhaseVal;
            } else if (newPhaseVal !== currentPhase) {
                const diff = (newPhaseVal - currentPhase + 4) % 4;
                if (diff === 1) {
                    newAngle += this.stepAngle;
                    newCount++;
                } else if (diff === 3) {
                    newAngle -= this.stepAngle;
                    newCount--;
                }
                currentPhase = newPhaseVal;
                changed = true;
            }
        } else {
            currentPhase = -1;
        }

        return { newPhase: currentPhase, newStepCount: newCount, newAngle, changed };
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        // Evaluate Outer Stepper (Pins 1)
        const a1Plus = this.getPinVoltage('A1+') > 2.5;
        const a1Minus = this.getPinVoltage('A1-') > 2.5;
        const b1Plus = this.getPinVoltage('B1+') > 2.5;
        const b1Minus = this.getPinVoltage('B1-') > 2.5;

        const outerResult = this.processStepper(
            a1Plus, a1Minus, b1Plus, b1Minus,
            this.currentPhaseOuter, this.stepCountOuter, this.outerAngle
        );
        this.currentPhaseOuter = outerResult.newPhase;

        if (outerResult.changed) {
            this.outerAngle = outerResult.newAngle;
            this.stepCountOuter = outerResult.newStepCount;
            this.state.outerAngle = this.outerAngle;
            this.stateChanged = true;
        }

        // Evaluate Inner Stepper (Pins 2)
        const a2Plus = this.getPinVoltage('A2+') > 2.5;
        const a2Minus = this.getPinVoltage('A2-') > 2.5;
        const b2Plus = this.getPinVoltage('B2+') > 2.5;
        const b2Minus = this.getPinVoltage('B2-') > 2.5;

        const innerResult = this.processStepper(
            a2Plus, a2Minus, b2Plus, b2Minus,
            this.currentPhaseInner, this.stepCountInner, this.innerAngle
        );
        this.currentPhaseInner = innerResult.newPhase;

        if (innerResult.changed) {
            this.innerAngle = innerResult.newAngle;
            this.stepCountInner = innerResult.newStepCount;
            this.state.innerAngle = this.innerAngle;
            this.stateChanged = true;
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            outerAngle: Number(this.outerAngle.toFixed(1)),
            outerStepCount: this.stepCountOuter,
            innerAngle: Number(this.innerAngle.toFixed(1)),
            innerStepCount: this.stepCountInner,
            stepsPerRevolution: Number((360 / this.stepAngle).toFixed(0)),
        });
    }

    // 12.4 v2: numeric UI state for SAB slot { f0: outerAngle, f1: innerAngle }.
    uiState() {
        return {
            f: {
                outerAngle: Number(this.state?.outerAngle || 0),
                innerAngle: Number(this.state?.innerAngle || 0),
            },
            i: {},
        };
    }

    validate(component: any, graph: Map<string, string[]>) {
        const requiredPins = ['A1+', 'A1-', 'B1+', 'B1-', 'A2+', 'A2-', 'B2+', 'B2-'];
        const issues = [];

        for (const pin of requiredPins) {
            const edges = graph.get(`${component.id}.${pin}`);
            if (!edges || edges.length === 0) {
                issues.push({
                    ruleId: 'biaxial-stepper-check',
                    severity: 'warn',
                    message: `[${component.type} ${component.id}] Coil pin ${pin} is floating.`,
                    compIds: [component.id],
                    remediation: `Connect ${pin} to a stepper driver output.`,
                    autoFix: true,
                });
            }
        }

        return issues.length > 0 ? issues : null;
    }
}
