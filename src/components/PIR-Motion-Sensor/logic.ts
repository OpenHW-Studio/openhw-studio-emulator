import { BaseComponent } from '../BaseComponent';

export class PIRLogic extends BaseComponent {
    private motionTimeout: any = null;
    private _simCpu?: any;
    private isUpdating: boolean = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.attrs = manifest.attrs || {};
        this.state = { motion: false };
        this._setVoltageInternal(0.0);
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        const isMotion = !!this.state?.motion;
        const currentV = isMotion ? 3.3 : 0.0;
        this._setVoltageInternal(currentV);
        if (currentWires && allComponentsInstances) {
            this.propagatePin('OUT', currentV, currentWires, allComponentsInstances);
        }
        const boardPin = this.getConnectedBoardPin();
        if (boardPin && typeof (this as any)._setAvrPinDirect === 'function') {
            (this as any)._setAvrPinDirect(boardPin, isMotion);
        }
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
                        const clean = pin.replace(/^D/i, '');
                        (this as any)._connectedPin = clean;
                        return clean;
                    }
                } else if (to === `${this.id}:OUT` || to === `${this.id}.OUT`) {
                    const parts = from.split(/[:\.]/);
                    const pin = parts[1] ?? null;
                    if (pin) {
                        const clean = pin.replace(/^D/i, '');
                        (this as any)._connectedPin = clean;
                        return clean;
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
        try { this.setPinVoltage('OUT', voltage); } catch (_) {}
    }

    private driveOut(voltage: number) {
        if (this.isUpdating) return;
        this.isUpdating = true;
        try {
            this._setVoltageInternal(voltage);
            const isHigh = voltage > 1.8;

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

    onEvent(event: any) {
        const type = typeof event === 'string' ? event : event?.type;
        if (type === 'motion_start') {
            this.setState({ motion: true });
            this.driveOut(3.3);
            if (this.motionTimeout) {
                clearTimeout(this.motionTimeout);
                this.motionTimeout = null;
            }
        } else if (type === 'motion_stop') {
            this.setState({ motion: false });
            this.driveOut(0.0);
            if (this.motionTimeout) {
                clearTimeout(this.motionTimeout);
                this.motionTimeout = null;
            }
        } else if (type === 'motion') {
            const delay = this.attrs.delay ? parseInt(this.attrs.delay, 10) : 500;
            this.setState({ motion: true });
            this.driveOut(3.3);
            if (this.motionTimeout) clearTimeout(this.motionTimeout);
            this.motionTimeout = setTimeout(() => {
                this.setState({ motion: false });
                this.driveOut(0.0);
                this.motionTimeout = null;
            }, delay);
        } else if (type === 'SET_ATTR') {
            if (event.key === 'delay') {
                this.attrs.delay = event.value;
                this.setState({ delay: Number(event.value) });
            }
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            motion: !!this.state?.motion,
            delay: this.attrs?.delay ? parseInt(this.attrs.delay, 10) : 500,
            targetBoard: (this as any)._simCpu?._avrRunner?.boardId || undefined
        });
    }
}

