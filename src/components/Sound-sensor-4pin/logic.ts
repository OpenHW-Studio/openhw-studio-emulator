import { BaseComponent } from '../BaseComponent';

export class SoundSensorLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            soundDetected: false,
            soundLevel: 0,
        };
        
        // BUG FIX: The UI occasionally wires to the label "D0" / "A0" instead of the ID "DO" / "AO".
        // We must define them internally so setPinVoltage doesn't throw errors.
        if (!this.pins['D0']) this.pins['D0'] = { voltage: 0, mode: 'OUTPUT' };
        if (!this.pins['A0']) this.pins['A0'] = { voltage: 0, mode: 'OUTPUT' };

        // Force a cache-miss so the first update() pushes the default 0V state down the wire.
        if (this.pins['DO']) this.pins['DO'].voltage = -1;
        if (this.pins['AO']) this.pins['AO'].voltage = -1;
        this.pins['D0'].voltage = -1;
        this.pins['A0'].voltage = -1;
    }

    onEvent(event: any) {
        if (event?.type === 'sound_state') {
            const detected = event.soundDetected === true;
            const level = Math.max(0, Math.min(1023, Math.round(Number(event.soundLevel) || 0)));
            this.setState({ soundDetected: detected, soundLevel: level });
            
            // Active High simulation logic (0V quiet, 5V detect)
            // Push directly to all possible pin ID/Label combinations
            const doVoltage = detected ? 5.0 : 0.0;
            const aoVoltage = (level / 1023) * 5.0;

            this.setPinVoltage('DO', doVoltage);
            this.setPinVoltage('D0', doVoltage);
            this.setPinVoltage('AO', aoVoltage);
            this.setPinVoltage('A0', aoVoltage);
        }
    }
}
