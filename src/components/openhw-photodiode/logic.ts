import { BaseComponent } from '../BaseComponent';

export class PhotodiodeLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        // Default light lux level (0 = dark, 100 = bright)
        this.state = { light: manifest.attrs?.light ?? 0 };
    }

    onEvent(event: any) {
        if (event.type === 'SET_ATTR') {
            this.state[event.key] = event.value;
            this.stateChanged = true;
            this.update();
        }
    }

    update() {
        const va = this.getPinVoltage('A');
        const vc = this.getPinVoltage('C');

        // Normal diode behavior in forward bias
        if (va > vc + 0.6) {
            this.setPinVoltage('C', Math.max(0, va - 0.7));
            return;
        }

        // Photodiode behavior in reverse bias
        if (vc > 0 && vc >= va) {
            const light = this.state.light; // 0 to 100
            this.setPinVoltage('A', (vc * light) / 100.0);
        } else if (vc === 0) {
            this.setPinVoltage('A', 0);
        }
    }

    getSyncState() {
        return { ...this.state };
    }

    // 12.4 v2: numeric UI state for SAB slot {f0: light} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {light: Number(s.light ?? 0)},
            i: {},
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
