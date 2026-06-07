import { BaseComponent } from '../BaseComponent';
import { PulseProtocol } from '../../protocol-handlers/index';

export class HCSR04Logic extends PulseProtocol {
    private isEchoing = false;

    /** Tracks the sensor's own ECHO output voltage separately from what the BFS may set. */
    private _echoOutputVoltage = 0;

    /** Returns the sensor's actual ECHO output voltage (5V when echoing, 0V when idle). */
    get echoOutputVoltage(): number {
        return this._echoOutputVoltage;
    }

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.attrs = manifest.attrs || {};
        this.state = { 
            ...this.state,
            distance: parseFloat(this.attrs.distance || '100') 
        };
    }

    sendPulse(pinId: string, isHigh: boolean, durationUs: number, idleVoltage: number = 0): void {
        super.sendPulse(pinId, isHigh, durationUs, idleVoltage);
        if (pinId === 'ECHO') {
            this._echoOutputVoltage = isHigh ? 5.0 : 0.0;
        }
    }

    onPulseReceived(pinId: string, isHighPulse: boolean, durationUs: number): void {
        // HC-SR04 triggers when TRIG pin receives a HIGH pulse of at least 10us
        if (pinId === 'TRIG' && isHighPulse && durationUs >= 10) {
            this.startEcho();
        }
    }

    private startEcho() {
        if (this.isEchoing) return;

        const distance = parseFloat(this.attrs?.distance || '100');
        const echoDurationUs = distance * 58;

        this.isEchoing = true;
        // Output HIGH pulse on ECHO pin
        this.sendPulse('ECHO', true, echoDurationUs, 0.0);
    }

    onEvent(event: any) {
        if (event?.type === 'input' && event.value !== undefined) {
            this.attrs.distance = String(event.value);
            this.state.distance = event.value;
            this.stateChanged = true;
        }
    }

    update(cpuCycles: number, wires: any[], instances: BaseComponent[]) {
        super.update(cpuCycles, wires, instances);
        // Track ECHO voltage set by pulse end
        const echoPin = this.pins['ECHO'];
        if (echoPin) {
            this._echoOutputVoltage = echoPin.voltage;
        }
        // If ECHO pin went low, echoing is done
        if (this.isEchoing && this.getPinVoltage('ECHO') < 2.5) {
            this.isEchoing = false;
        }
    }

    onCustomTelemetry() {
        const distance = parseFloat(this.attrs?.distance || '100');
        const echoDurationUs = distance * 58; // Speed of sound: 340 m/s
        
        this.setCustomTelemetry({
            configuredDistance: distance,
            echoDurationUs: Number(echoDurationUs.toFixed(1)),
            isEchoing: this.isEchoing,
            lastMeasurement: this.state.distance || distance,
        });
    }
}
