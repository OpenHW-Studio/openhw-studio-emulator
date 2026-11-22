import { BaseComponent } from '../BaseComponent';

export class LogicAnalyzerLogic extends BaseComponent {
    private lastVal = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { active: false };
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        if (pinId.startsWith('D')) {
            let val = 0;
            for (let i = 0; i < 8; i++) {
                if (this.getPinVoltage(`D${i}`) > 2.5) {
                    val |= (1 << i);
                }
            }
            if (val !== this.lastVal) {
                // Signal change detected. Trigger UI indicator.
                this.state.active = true;
                this.stateChanged = true;
                this.lastVal = val;

                // Clear active flag shortly after to simulate pulse
                setTimeout(() => {
                    this.state.active = false;
                    this.stateChanged = true;
                }, 50);
            }
        }
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
