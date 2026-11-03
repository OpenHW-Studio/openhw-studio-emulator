import { BaseComponent } from '../BaseComponent';

export class BreadboardLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {};
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        // Breadboards are passive and handled natively by the engine's netlist generator.
    }

    // 12.4 v2: numeric UI state for SAB slot {} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
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
