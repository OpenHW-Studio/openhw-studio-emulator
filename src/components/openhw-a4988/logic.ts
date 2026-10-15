import { BaseComponent } from '../BaseComponent';

// Full-step sequence mapping
const PHASE_MAP = [
    { '1A': 1, '1B': 0, '2A': 1, '2B': 0 }, // Step 0
    { '1A': 0, '1B': 1, '2A': 1, '2B': 0 }, // Step 1
    { '1A': 0, '1B': 1, '2A': 0, '2B': 1 }, // Step 2
    { '1A': 1, '1B': 0, '2A': 0, '2B': 1 }  // Step 3
];

export class A4988Logic extends BaseComponent {
    private stepPos = 0;
    private stepPinLast = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { active: false };
        if (this.pins['1A']) this.pins['1A'].mode = 'OUTPUT';
        if (this.pins['1B']) this.pins['1B'].mode = 'OUTPUT';
        if (this.pins['2A']) this.pins['2A'].mode = 'OUTPUT';
        if (this.pins['2B']) this.pins['2B'].mode = 'OUTPUT';
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        if (pinId === 'STEP') {
            if (isHigh && !this.stepPinLast) { // Rising edge
                // Check Enable (Active LOW)
                const enabled = this.getPinVoltage('ENABLE') < 2.5;
                // Sleep & Reset (Active LOW, meaning must be HIGH to operate)
                const asleep = this.getPinVoltage('SLEEP') < 2.5;
                const reset = this.getPinVoltage('RESET') < 2.5;

                // If not asleep, not reset, and enabled, process step
                if (!asleep && !reset && enabled) {
                    const dir = this.getPinVoltage('DIR') > 2.5 ? 1 : -1;
                    this.stepPos = (this.stepPos + dir + 4) % 4;
                    this.updateOutputs();
                }
            }
            this.stepPinLast = isHigh;
        }

        if (pinId === 'ENABLE' || pinId === 'SLEEP' || pinId === 'RESET') {
            this.updateOutputs();
        }
    }

    private updateOutputs() {
        const enabled = this.getPinVoltage('ENABLE') < 2.5;
        const asleep = this.getPinVoltage('SLEEP') < 2.5;
        const reset = this.getPinVoltage('RESET') < 2.5;

        // If disabled, reset, or asleep, coils are off (freewheeling)
        if (asleep || reset || !enabled) {
            this.setPinVoltage('1A', 0);
            this.setPinVoltage('1B', 0);
            this.setPinVoltage('2A', 0);
            this.setPinVoltage('2B', 0);
            this.state.active = false;
        } else {
            const phase = PHASE_MAP[this.stepPos];
            this.setPinVoltage('1A', phase['1A'] ? 5 : 0);
            this.setPinVoltage('1B', phase['1B'] ? 5 : 0);
            this.setPinVoltage('2A', phase['2A'] ? 5 : 0);
            this.setPinVoltage('2B', phase['2B'] ? 5 : 0);
            this.state.active = true;
        }
        this.stateChanged = true;
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: active} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {active: (s.active ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const pins = validator.getComponentPins(component);
        const vcc = pins.find((p:any) => p.includes('VCC') || p.includes('5V') || p.includes('3V3') || p.includes('V+'));
        const gnd = pins.find((p:any) => p.includes('GND'));

        if (vcc) {
            const node = `${component.id}.${vcc}`;
            if (((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length === 0) {
                return '⚠️ [' + component.type + ' ' + component.id + '] Power is not connected.';
            } else if (!validator.hasResistivePathToSupply(node)) {
                return '⚠️ [' + component.type + ' ' + component.id + '] Power is connected but does not reach a valid power supply rail.';
            }
        }

        if (gnd) {
            const node = `${component.id}.${gnd}`;
            if (((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length === 0) {
                return '⚠️ [' + component.type + ' ' + component.id + '] Ground is not connected.';
            } else {
                const gndSources = validator.collectVoltageSources(node);
                if (!gndSources.some((s: any) => s.voltage === 0)) {
                    return '⚠️ [' + component.type + ' ' + component.id + '] Ground is connected but does not reach a valid ground rail (GND).';
                }
            }
        }

        return null;
    }
}
