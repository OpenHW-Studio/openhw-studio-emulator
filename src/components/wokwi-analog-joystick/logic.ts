import { BaseComponent } from '../BaseComponent';

export class AnalogJoystickLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);

        this.state = {
            ...this.state,
            x: 0,       // -1.0 to 1.0 (Left to Right)
            y: 0,       // -1.0 to 1.0 (Up to Down, naturally)
            pressed: false // Button state
        };
    }

    onEvent(event: any) {
        if (event.type === 'joystick-move') {
            this.setState({
                x: event.x,
                y: event.y
            });
        }
        if (event.type === 'button-press') {
            this.setState({ pressed: true });
        }
        if (event.type === 'button-release') {
            this.setState({ pressed: false });
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        // Map X and Y coordinates (from -1 to 1) to Analog Voltages (0V to 5V).
        // Center position (0) should map to 2.5V (idle state).
        // 
        // Wokwi joystick X axis: X = -1 (left), X = 1 (right)
        // Wokwi joystick Y axis: Y = -1 (up), Y = 1 (down)
        
        const xVolts = ((this.state.x + 1) / 2) * 5.0;  // -1 => 0V, 1 => 5V
        const yVolts = ((this.state.y + 1) / 2) * 5.0;  // -1 => 0V, 1 => 5V
        
        this.setPinVoltage('HOR', xVolts);
        this.setPinVoltage('VER', yVolts);
    }
}
