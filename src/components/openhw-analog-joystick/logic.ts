import { BaseComponent } from '../BaseComponent';

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
}
