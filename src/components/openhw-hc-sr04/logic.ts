import { BaseComponent } from '../BaseComponent';
import { PulseProtocol } from '../../protocol-handlers/index';

export class HCSR04Logic extends PulseProtocol {
    private isEchoing = false;
    private _simCpu?: any;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.attrs = manifest.attrs || {};
        this.state = {
            ...this.state,
            distance: parseFloat(this.attrs.distance || '100')
        };
        // Ensure ECHO defaults to 0.0V (LOW) at startup so pulseIn() won't time out
        this._setVoltageInternal(0.0);
    }

    private getConnectedBoardPin(): string | null {
        if ((this as any)._connectedPin != null) return (this as any)._connectedPin;
        const runner = this._simCpu?._avrRunner;
        if (runner?.currentWires) {
            for (const wire of runner.currentWires) {
                const from: string = wire.from || '';
                const to: string = wire.to || '';
                if (from === `${this.id}:ECHO` || from === `${this.id}.ECHO`) {
                    const parts = to.split(/[:\.]/);
                    const pin = parts[1] ?? null;
                    if (pin) {
                        (this as any)._connectedPin = pin;
                        return pin;
                    }
                } else if (to === `${this.id}:ECHO` || to === `${this.id}.ECHO`) {
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

    private _setVoltageInternal(voltage: number) {
        if (!this.pins['ECHO']) this.pins['ECHO'] = { voltage: 0, mode: 'OUTPUT' };
        this.pins['ECHO'].voltage = voltage;
        try { this.setPinVoltage('ECHO', voltage); } catch (_) {}
    }

    private driveEcho(voltage: number) {
        this._setVoltageInternal(voltage);
        const isHigh = voltage > 1.8;

        // Fast path: directly write to AVR PIN register so pulseIn() reads the pulse instantly
        const boardPin = this.getConnectedBoardPin();
        if (boardPin && typeof (this as any)._setAvrPinDirect === 'function') {
            (this as any)._setAvrPinDirect(boardPin, isHigh);
        }

        // Fallback: propagate through full netlist
        if ((this as any)._simUpdatePhysics) {
            (this as any)._simUpdatePhysics();
        }
    }

    onPulseReceived(pinId: string, isHighPulse: boolean, durationUs: number): void {
        // HC-SR04 triggers when TRIG pin receives a HIGH pulse.
        // Standard trigger is 10us, but check >= 8us to handle clock cycle/precision variations on AVR boards
        if (pinId === 'TRIG' && isHighPulse && durationUs >= 8) {
            this.startEcho();
        }
    }

    onEvent(event: any) {
        if (event.type === 'SET_ATTR') {
            this.attrs = this.attrs || {};
            this.attrs[event.key] = String(event.value);
            if (event.key === 'distance') {
                this.state.distance = String(event.value);
            }
            this.stateChanged = true;
        }
    }

    private startEcho() {
        if (this.isEchoing) return;

        const distance = parseFloat(String(this.attrs?.distance ?? this.state?.distance ?? '100'));
        const echoDurationUs = Math.max(116, Math.round(distance * 58));

        this.isEchoing = true;
        
        // Wait ~200us before driving ECHO high to simulate 8-cycle 40kHz sonic burst.
        // This gives the Arduino CPU enough time to hit the pulseIn() instruction.
        const cpu = (this as any)._simCpu;
        if (cpu && typeof cpu.addClockEvent === 'function') {
            cpu.addClockEvent(() => {
                this.driveEcho(5.0); // Start pulse
                cpu.addClockEvent(() => {
                    this.driveEcho(0.0); // End pulse
                    this.isEchoing = false;
                }, echoDurationUs * 16);
            }, 200 * 16); // 200us at 16MHz
        } else {
            // Fallback for non-AVR runners
            this.sendPulse('ECHO', true, echoDurationUs, 0.0);
            this.isEchoing = false;
        }
    }

    update(cpuCycles: number, wires: any[], instances: BaseComponent[]) {
        super.update(cpuCycles, wires, instances);
        // If ECHO pin went low, echoing is done
        if (this.isEchoing && this.getPinVoltage('ECHO') < 2.5) {
            this.isEchoing = false;
        }
    }

    onCustomTelemetry() {
        const distance = parseFloat(String(this.attrs?.distance ?? this.state?.distance ?? '100'));
        const echoDurationUs = distance * 58; // Speed of sound: 340 m/s

        this.setCustomTelemetry({
            configuredDistance: distance,
            echoDurationUs: Number(echoDurationUs.toFixed(1)),
            isEchoing: this.isEchoing,
            lastMeasurement: this.state.distance || distance,
        });
    }
}
