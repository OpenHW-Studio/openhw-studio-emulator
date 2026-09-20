import { BaseComponent } from '../BaseComponent';

// Relay Module (single channel, 5V active-LOW trigger)
//
// Real hardware behaviour:
//   - Control pin (IN) is ACTIVE LOW by default (most relay modules)
//   - When IN is LOW (or pulled LOW by Arduino): relay ENERGISED → COM connects to NO
//   - When IN is HIGH (or floating): relay DE-ENERGISED → COM connects to NC
//   - Coil draws ~70mA — must be powered by VCC/GND, NOT directly from Arduino 5V pin
//
// Arduino sketch:
//   pinMode(7, OUTPUT);
//   digitalWrite(7, LOW);  // relay ON  (active-low)
//   digitalWrite(7, HIGH); // relay OFF

export class RelayModuleLogic extends BaseComponent {
    private energised: boolean = false;
    private triggerLevel: string = 'low'; // 'low' | 'high'

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.triggerLevel = manifest.attrs?.triggerLevel ?? 'low';
        this.state = {
            energised: false,
            ledOn:     false,
        };
    }

    onEvent(event: any) {
        if (event.type === 'relay-toggle') {
            this.energised = !this.energised;
            this.setState({ energised: this.energised, ledOn: this.energised });
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        const vcc = this.getPinVoltage('VCC');
        const inp = this.getPinVoltage('IN');

        if (vcc < 2.5) {
            // Not powered
            this.energised = false;
            this.setState({ energised: false, ledOn: false });
            return;
        }

        // Determine energised state based on trigger level
        if (this.triggerLevel === 'low') {
            // Active LOW: energised when IN is pulled LOW (< 1V)
            this.energised = inp < 1.0;
        } else {
            // Active HIGH: energised when IN is HIGH (> 2.5V)
            this.energised = inp > 2.5;
        }

        // When energised: COM connects to NO, break from NC
        // Propagate voltage through COM→NO path
        if (this.energised) {
            const comV = this.getPinVoltage('COM');
            // NO not defined in simplified manifest but logic is tracked via state
        }

        this.setState({ energised: this.energised, ledOn: this.energised });
    }

    // 12.4 v2: numeric UI state for SAB slot { i0: energised, i1: ledOn }.
    uiState() {
        return {
            f: {},
            i: {
                energised: this.state?.energised ? 1 : 0,
                ledOn: this.state?.ledOn ? 1 : 0,
            },
        };
    }

    validate(component: any, graph: Map<string, string[]>) {
        const vcc = graph.get(`${component.id}.VCC`);
        const gnd = graph.get(`${component.id}.GND`);
        const inp = graph.get(`${component.id}.IN`);
        const issues = [];
        if (!vcc || vcc.length === 0) {
            issues.push({
                ruleId: 'relay-module-power-check',
                severity: 'warn',
                message: `[Relay ${component.id}] VCC not connected. Connect to 5V (not Arduino 5V pin — use external supply for high-current loads).`,
                compIds: [component.id],
                remediation: 'Connect the relay VCC pin to a 5V supply.',
            });
        }
        if (!gnd || gnd.length === 0) {
            issues.push({
                ruleId: 'relay-module-power-check',
                severity: 'warn',
                message: `[Relay ${component.id}] GND not connected.`,
                compIds: [component.id],
                remediation: 'Connect the relay GND pin to ground.',
            });
        }
        if (!inp || inp.length === 0) {
            issues.push({
                ruleId: 'relay-module-control-pin-check',
                severity: 'warn',
                message: `[Relay ${component.id}] IN pin not connected. Connect to an Arduino digital output pin.`,
                compIds: [component.id],
                remediation: 'Connect the relay IN pin to a digital output.',
            });
        }
        return issues.length > 0 ? issues : null;
    }
}
