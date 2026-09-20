import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';

export class JoystickLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        // Default to center (0.5, 0.5) and not pressed
        this.state = { x: 0.5, y: 0.5, pressed: false };
    }

    getMnaPins() {
        return ['VCC', 'GND', 'VRX', 'VRY', 'SW'];
    }

    getMnaStamps() {
        const stamps = [];
        
        // Switch connects SW and GND when pressed.
        const switchCond = this.state.pressed ? 1000 : 1e-9;
        stamps.push({ pins: ['SW', 'GND'], g: switchCond });

        // VRX Potentiometer (10k ohms total)
        const xVal = this.state.x; // 0.0 to 1.0
        const xR1 = Math.max(0.1, 10000 * (1 - xVal));
        const xR2 = Math.max(0.1, 10000 * xVal);
        stamps.push({ pins: ['VCC', 'VRX'], g: 1 / xR1 });
        stamps.push({ pins: ['GND', 'VRX'], g: 1 / xR2 });

        // VRY Potentiometer (10k ohms total)
        const yVal = this.state.y; // 0.0 to 1.0
        const yR1 = Math.max(0.1, 10000 * (1 - yVal));
        const yR2 = Math.max(0.1, 10000 * yVal);
        stamps.push({ pins: ['VCC', 'VRY'], g: 1 / yR1 });
        stamps.push({ pins: ['GND', 'VRY'], g: 1 / yR2 });

        return stamps;
    }

    onEvent(event: string | any) {
        if (typeof event === 'string') {
            if (event === 'press') {
                this.setState({ pressed: true });
            } else if (event === 'release') {
                this.setState({ pressed: false });
            }
        } else if (typeof event === 'object' && event.type === 'move') {
            this.setState({ x: event.x, y: event.y });
        }
    }

    update() {
        // We use MNA stamps to simulate the analog potentiometers,
        // but we still update the internal pin voltage states for telemetry/UI.
        const vcc = this.getPinVoltage('VCC') || this.getPinVoltage('5V') || 5.0; // check both pin name aliases
        const gnd = this.getPinVoltage('GND') || 0.0;

        const vx = gnd + this.state.x * (vcc - gnd);
        const vy = gnd + this.state.y * (vcc - gnd);

        this.setPinVoltage('VRX', vx);
        this.setPinVoltage('VRY', vy);
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            position: `(${this.state.x.toFixed(2)}, ${this.state.y.toFixed(2)})`,
            buttonPressed: !!this.state.pressed,
            vrxVoltage: Number((this.getPinVoltage('VRX') || 0).toFixed(2)),
            vryVoltage: Number((this.getPinVoltage('VRY') || 0).toFixed(2))
        });
    }

    // 12.4 v2: numeric UI state for SAB slot {f0: x, f1: y, i0: pressed} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {x: Number(s.x ?? 0), y: Number(s.y ?? 0)},
            i: {pressed: (s.pressed ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const pins = validator.getComponentPins(component);
        const vcc = pins.find((p: string) => p.includes('VCC') || p.includes('5V') || p.includes('V+'));
        const gnd = pins.find((p: string) => p.includes('GND'));
        const sigPins = pins.filter((p: string) => p.includes('SIG') || p.includes('OUT') || p.includes('VERT') || p.includes('HORZ') || p.includes('SEL') || p.includes('AO'));
        const issues = [];

        if (vcc) {
            const node = `${component.id}.${vcc}`;
            if (((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length === 0) {
                issues.push(createValidationIssue({
                    ruleId: 'analog-joystick-connection-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Power is not connected.`,
                    compIds: [component.id],
                    remediation: 'Connect the joystick power pin to the supply rail.',
                    autoFix: true,
                }));
            } else if (!validator.hasResistivePathToSupply(node)) {
                issues.push(createValidationIssue({
                    ruleId: 'analog-joystick-connection-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Power is connected but does not reach a valid power supply rail.`,
                    compIds: [component.id],
                    remediation: 'Ensure power path connects to a 5V/3.3V power source.',
                }));
            }
        }

        if (gnd) {
            const node = `${component.id}.${gnd}`;
            if (((validator ? validator.getNeighbors(node) : (graph.get(node) || []))).length === 0) {
                issues.push(createValidationIssue({
                    ruleId: 'analog-joystick-connection-check',
                    severity: 'warn',
                    message: `⚠️ [${component.type} ${component.id}] Ground is not connected.`,
                    compIds: [component.id],
                    remediation: 'Connect the joystick ground pin to the common ground rail.',
                    autoFix: true,
                }));
            } else {
                const gndSources = validator.collectVoltageSources(node);
                if (!gndSources.some((s: any) => s.voltage === 0)) {
                    issues.push(createValidationIssue({
                        ruleId: 'analog-joystick-connection-check',
                        severity: 'warn',
                        message: `⚠️ [${component.type} ${component.id}] Ground is connected but does not reach a valid ground rail (GND).`,
                        compIds: [component.id],
                        remediation: 'Ensure ground path connects to a valid ground rail.',
                    }));
                }
            }
        }

        const connectedSigs = sigPins.filter(p => ((validator ? validator.getNeighbors(`${component.id}.${p}`) : (graph.get(`${component.id}.${p}`) || []))).length > 0);
        if (sigPins.length > 0 && connectedSigs.length === 0) {
            issues.push(createValidationIssue({
                ruleId: 'analog-joystick-connection-check',
                severity: 'warn',
                message: `⚠️ [${component.type} ${component.id}] Warning: No signal/output pins are connected. The sensor will not provide any data.`,
                compIds: [component.id],
                remediation: 'Wire the analog output pins to the MCU input pins.',
                autoFix: true,
            }));
        }

        return issues.length > 0 ? issues : null;
    }
}
