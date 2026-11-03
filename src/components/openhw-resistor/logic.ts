import { BaseComponent } from '../BaseComponent';

export class ResistorLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            current: 0,
            voltageDrop: 0,
            power: 0,
            glow: false,
            vHistory: []
        };
    }

    getConductance() {
        const resistance = parseFloat(this.state.value || this.state.resistance || 1000);
        return resistance > 0 ? 1 / resistance : 1000; // Cap at 1mOhm
    }

    update() {
        const v1 = this.getPinVoltage('p1');
        const v2 = this.getPinVoltage('p2');
        const resistance = parseFloat(this.state.value || this.state.resistance || 1000);
        
        const vDiff = Math.abs(v1 - v2);
        const current = resistance > 0 ? vDiff / resistance : 0;

        const power = current * vDiff;
        const vHistory = [...(this.state.vHistory || []).slice(-19), vDiff];

        this.setState({
            voltageDrop: vDiff,
            current: current,
            power: power,
            glow: power > 0.2, // Glow if > 200mW
            vHistory
        });
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            voltageDrop: this.state.voltageDrop.toFixed(2) + ' V',
            current: (this.state.current * 1000).toFixed(2) + ' mA',
            power: (this.state.power * 1000).toFixed(2) + ' mW'
        });
    }

    // 12.4 v2: numeric UI state for SAB slot { f0: voltageDrop, f1: current, i0: glow }.
    uiState() {
        return {
            f: {
                voltageDrop: Number(this.state?.voltageDrop || 0),
                current: Number(this.state?.current || 0),
            },
            i: { glow: this.state?.glow ? 1 : 0 },
        };
    }

    validate(_component: any, _graph: Map<string, string[]>) {
        return null;
    }
}
