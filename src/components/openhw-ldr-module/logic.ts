import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';

export class LdrModuleLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        // Sync initial attributes to state
        this.state = {
            light: manifest.attrs?.lux ?? 100,
            threshold: manifest.attrs?.threshold ?? 500,
            pwrLed: false,
            dOut: false,
            doLed: false
        };
    }

    // This handles updates from the Context Menu's onUpdate call or interactive sliders
    onEvent(event: any) {
        if (event.type === 'SET_ATTR') {
            // Support both 'lux' and 'light' as the key for light level
            const key = event.key === 'lux' ? 'light' : event.key;
            this.state[key] = event.value;
            this.stateChanged = true;
            if (typeof (this as any)._simUpdatePhysics === 'function') {
                (this as any)._simUpdatePhysics();
            }
        }
    }

    update(cpuCycles: number, wires: any[], instances: BaseComponent[]) {
        const vcc = this.getPinVoltage('VCC') || this.getPinVoltage('5V') || 5.0;
        const gnd = this.getPinVoltage('GND');

        if (vcc > 2.0 && gnd < 1.0) {
            this.state.pwrLed = true;

            // Analog Output (AO): Force analogRead() to perfectly equal the slider value (1:1 mapping)
            const targetAdc = this.state.light;
            const aoVoltage = vcc * ((targetAdc + 0.1) / 1023); // +0.1 prevents rounding down
            this.propagatePin('AO', aoVoltage, wires, instances);

            // Digital Output (DO): High if light is BELOW threshold (Darkness detection)
            const thresholdVolts = vcc * (this.state.threshold / 1000);
            const isHigh = aoVoltage <= thresholdVolts;

            this.propagatePin('DO', isHigh ? vcc : 0, wires, instances);
            this.state.dOut = isHigh;
            this.state.doLed = isHigh;
            this.stateChanged = true;
        } else {
            this.state.pwrLed = false;
            this.state.dOut = false;
            this.state.doLed = false;
            this.propagatePin('AO', 0, wires, instances);
            this.propagatePin('DO', 0, wires, instances);
            this.stateChanged = true;
        }
    }

    getSyncState() {
        return { ...this.state };
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            light: this.state.light,
            threshold: this.state.threshold,
            analogOutV: Number((this.getPinVoltage('AO') || 0).toFixed(2)),
            dOut: !!this.state.dOut
        });
    }

    // 12.4 v2: numeric UI state for SAB slot {f0: light, i0: dOut} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {light: Number(s.light ?? 0)},
            i: {dOut: (s.dOut ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const vccNode = `${component.id}.VCC`;
        const gndNode = `${component.id}.GND`;
        const outNode = `${component.id}.AO`;
        const vccV = validator.calculateVoltageAtNode(vccNode);
        const gndV = validator.calculateVoltageAtNode(gndNode);

        if (vccV > 0.5 && Math.abs(vccV - gndV) < 0.1) {
            return createValidationIssue({
                ruleId: 'ldr-module-wiring-check',
                severity: 'error',
                message: `🔥 [LDR Module ${component.id}] FATAL: VCC and GND are shorted on the module pins!`,
                compIds: [component.id],
                remediation: 'Fix the short between VCC and GND.',
                autoFix: false,
            });
        }

        if (((validator ? validator.getNeighbors(vccNode) : (graph.get(vccNode) || []))).length > 0 && ((validator ? validator.getNeighbors(outNode) : (graph.get(outNode) || []))).length === 0) {
            return createValidationIssue({
                ruleId: 'ldr-module-wiring-check',
                severity: 'warn',
                message: `⚠️ [LDR Module ${component.id}] Warning: Module is powered but the Signal (AO) pin is not connected to anything.`,
                compIds: [component.id],
                remediation: 'Connect AO to an analog input pin.',
                autoFix: true,
            });
        }

        return null;
    }
}
