import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';

export class SoilMoistureSensorLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { moisture: 50 }; // Default 50%
    }

    onPinStateChange() {
        const vcc = this.getPinVoltage('VCC') || this.getPinVoltage('5V');
        if (vcc < 1.0) {
            this.setPinVoltage('SIG', 0);
            return;
        }

        const m = Math.max(0, Math.min(100, this.state.moisture));

        // Analog: VCC when dry (1023), 0.0V when completely submerged (0)
        const dryVolt = vcc;
        const wetVolt = 0.0;
        const outSig = wetVolt + ((100 - m) / 100) * (dryVolt - wetVolt);

        this.setPinVoltage('SIG', outSig);
    }

    onEvent(event: any) {
        if (event && event.type === 'SET_MOISTURE') {
            this.setState({ moisture: event.value });
            this.stateChanged = true;
            this.onPinStateChange();
        }
    }

    onCustomTelemetry() {
        const vcc = this.getPinVoltage('VCC') || this.getPinVoltage('5V');
        const sig = this.getPinVoltage('SIG');
        
        this.setCustomTelemetry({
            moisturePercent: Number(this.state.moisture.toFixed(1)),
            vccVoltage: Number(vcc.toFixed(2)),
            outputVoltage: Number(sig.toFixed(2)),
            sensorType: 'Capacitive Soil Moisture',
        });
    }

    // 12.4 v2: numeric UI state for SAB slot {f0: moisture} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {moisture: Number(s.moisture ?? 0)},
            i: {},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const pins = validator.getComponentPins(component);
        const vcc = pins.find((p: string) => p.includes('VCC') || p.includes('5V') || p.includes('V+'));
        const gnd = pins.find((p: string) => p.includes('GND'));
        const sigPins = pins.filter((p: string) => p.includes('SIG') || p.includes('OUT') || p.includes('AO') || p.includes('DO'));

        if (vcc) {
            const node = `${component.id}.${vcc}`;
            if (((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length === 0) {
                return createValidationIssue({
                    ruleId: 'soil-moisture-sensor-connection-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Power is not connected.`,
                    compIds: [component.id],
                    remediation: 'Connect the sensor power pin to the supply rail.',
                    autoFix: true,
                });
            } else if (!validator.hasResistivePathToSupply(node)) {
                return createValidationIssue({
                    ruleId: 'soil-moisture-sensor-connection-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Power is connected but does not reach a valid power supply rail.`,
                    compIds: [component.id],
                    remediation: 'Ensure power path connects to a 3.3V/5V power source.',
                });
            }
        }

        if (gnd) {
            const node = `${component.id}.${gnd}`;
            if (((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length === 0) {
                return createValidationIssue({
                    ruleId: 'soil-moisture-sensor-connection-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Ground is not connected.`,
                    compIds: [component.id],
                    remediation: 'Connect the sensor ground pin to the common ground rail.',
                    autoFix: true,
                });
            } else {
                const gndSources = validator.collectVoltageSources(node);
                if (!gndSources.some((s: any) => s.voltage === 0)) {
                    return createValidationIssue({
                        ruleId: 'soil-moisture-sensor-connection-check',
                        severity: 'warn',
                        message: `⚠️ [${component.type} ${component.id}] Ground is connected but does not reach a valid ground rail (GND).`,
                        compIds: [component.id],
                        remediation: 'Ensure ground path connects to a valid ground rail.',
                    });
                }
            }
        }

        const connectedSigs = sigPins.filter(p => ((validator ? validator.getNeighbors(`${component.id}.${p}`) : (graph.get(`${component.id}.${p}`) || []))).length > 0);
        if (sigPins.length > 0 && connectedSigs.length === 0) {
            return createValidationIssue({
                ruleId: 'soil-moisture-sensor-connection-check',
                severity: 'warn',
                message: `⚠️ [${component.type} ${component.id}] Warning: No signal/output pins are connected. The sensor will not provide any data.`,
                compIds: [component.id],
                remediation: 'Wire the signal output to an MCU input or analog read pin.',
                autoFix: true,
            });
        }

        return null;
    }
}
