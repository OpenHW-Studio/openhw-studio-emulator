import { BaseComponent } from '../BaseComponent';

export class PIRLogic extends BaseComponent {
    private motionTimeout: any = null;
    private _simCpu?: any;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.attrs = manifest.attrs || {};
        this.state = { motion: false };
        this._setVoltageInternal(0.0);
    }

    public getConnectedBoardPin(): string | null {
        if ((this as any)._connectedPin != null) return (this as any)._connectedPin;
        const runner = this._simCpu?._avrRunner;
        if (runner?.currentWires) {
            for (const wire of runner.currentWires) {
                const from: string = wire.from || '';
                const to: string = wire.to || '';
                if (from === `${this.id}:OUT` || from === `${this.id}.OUT`) {
                    const parts = to.split(/[:\.]/);
                    const pin = parts[1] ?? null;
                    if (pin) {
                        (this as any)._connectedPin = pin;
                        return pin;
                    }
                } else if (to === `${this.id}:OUT` || to === `${this.id}.OUT`) {
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

    private _setVoltageInternal(voltage: number) {
        (this as any)._drivingBus = true;
        (this as any)._lastDrivenVoltage = voltage;
        if (!this.pins['OUT']) this.pins['OUT'] = { voltage: 0, mode: 'OUTPUT' };
        this.pins['OUT'].voltage = voltage;
        try { this.setPinVoltage('OUT', voltage); } catch (_) {}
    }

    private driveOut(voltage: number) {
        this._setVoltageInternal(voltage);
        const isHigh = voltage > 1.8;

        const boardPin = this.getConnectedBoardPin();
        if (boardPin && typeof (this as any)._setAvrPinDirect === 'function') {
            (this as any)._setAvrPinDirect(boardPin, isHigh);
        }

        if ((this as any)._simUpdatePhysics) {
            (this as any)._simUpdatePhysics();
        }
    }

    onEvent(event: string) {
        if (event === 'motion_start') {
            this.setState({ motion: true });
            this.driveOut(3.3);
            if (this.motionTimeout) {
                clearTimeout(this.motionTimeout);
                this.motionTimeout = null;
            }
        } else if (event === 'motion_stop') {
            this.setState({ motion: false });
            this.driveOut(0.0);
            if (this.motionTimeout) {
                clearTimeout(this.motionTimeout);
                this.motionTimeout = null;
            }
        } else if (event === 'motion') {
            const delay = this.attrs.delay ? parseInt(this.attrs.delay) : 500;
            this.setState({ motion: true });
            this.driveOut(3.3);
            if (this.motionTimeout) clearTimeout(this.motionTimeout);
            this.motionTimeout = setTimeout(() => {
                this.setState({ motion: false });
                this.driveOut(0.0);
                this.motionTimeout = null;
            }, delay);
        }
    }
}
