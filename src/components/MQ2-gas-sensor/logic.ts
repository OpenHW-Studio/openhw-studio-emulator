import { BaseComponent } from '../BaseComponent';

export class GasSensorLogic extends BaseComponent {
    private lastOutputTime: number = 0;
    private _simCpu?: any;
    private isUpdating: boolean = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);

        // Initialize default state
        const threshold = Number(this.attrs?.threshold ?? this.state?.threshold ?? 300);
        const gasLevel = Number(this.attrs?.gasLevel ?? this.state?.gasLevel ?? 0);

        this.state = {
            ...this.state,
            threshold,
            gasLevel,                           // Analog value 0-1023
            limitExceeded: gasLevel > threshold // Digital value
        };

        this.updateVoltages();
    }

    public getConnectedBoardPin(): string | null {
        if ((this as any)._connectedPin != null) return (this as any)._connectedPin;
        const runner = this._simCpu?._avrRunner;
        if (runner?.currentWires) {
            for (const wire of runner.currentWires) {
                const from: string = wire.from || '';
                const to: string = wire.to || '';
                if (from === `${this.id}:DO` || from === `${this.id}.DO`) {
                    const parts = to.split(/[:\.]/);
                    const pin = parts[1] ?? null;
                    if (pin) {
                        (this as any)._connectedPin = pin;
                        return pin;
                    }
                } else if (to === `${this.id}:DO` || to === `${this.id}.DO`) {
                    const parts = from.split(/[:\.]/);
                    const pin = parts[1] ?? null;
                    if (pin) {
                        (this as any)._connectedPin = pin;
                        return pin;
                    }
                }
            }
        }
        return null;
    }

    public getBoardPin(): string | null {
        return this.getConnectedBoardPin();
    }

    onEvent(event: any) {
        if (event.type === 'gas_level' || event.type === 'SET_ATTR') {
            const val = event.value !== undefined ? event.value : (event.key === 'gasLevel' ? event.value : this.state.gasLevel);
            const level = Math.max(0, Math.min(1023, Math.round(Number(val))));
            const threshold = Number(this.attrs?.threshold ?? this.state?.threshold ?? 300);
            const limitExceeded = level > threshold;

            this.setState({
                gasLevel: level,
                threshold,
                limitExceeded
            });

            this.updateVoltages();
        }
    }

    private updateVoltages() {
        if (this.isUpdating) return;
        this.isUpdating = true;
        try {
            const vcc = this.getPinVoltage('VCC') || this.getPinVoltage('5V') || 5.0;
            const gnd = this.getPinVoltage('GND');

            const hasPower = (vcc - gnd) >= 3.0;

            const gasLevel = Number(this.state?.gasLevel ?? 0);
            const threshold = Number(this.attrs?.threshold ?? this.state?.threshold ?? 300);
            const limitExceeded = gasLevel > threshold;

            const analogVoltage = hasPower ? (gasLevel / 1023) * vcc : 0.0;

            // DO outputs LOW (0V) when limit exceeded (Active Low like LM393 comparator on MQ-2 modules)
            // If not powered or gas below threshold, DO is HIGH (5V)
            const digitalVoltage = hasPower ? (limitExceeded ? 0.0 : vcc) : 0.0;

            (this as any)._drivingBus = true;
            (this as any)._lastDrivenVoltage = digitalVoltage;

            this.setPinVoltage('AO', analogVoltage);
            this.setPinVoltage('DO', digitalVoltage);

            const isHigh = digitalVoltage > 1.8;
            const boardPin = this.getConnectedBoardPin();
            if (boardPin && typeof (this as any)._setAvrPinDirect === 'function') {
                (this as any)._setAvrPinDirect(boardPin, isHigh);
            }

            if ((this as any)._simUpdatePhysics) {
                (this as any)._simUpdatePhysics();
            }
        } finally {
            this.isUpdating = false;
        }
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        if (pinId === 'VCC' || pinId === '5V' || pinId === 'GND') {
            this.updateVoltages();
        }
    }
}
