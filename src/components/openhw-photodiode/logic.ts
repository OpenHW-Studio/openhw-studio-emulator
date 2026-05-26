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
}
