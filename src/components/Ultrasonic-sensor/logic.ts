import { BaseComponent } from '../BaseComponent';

type HCSR04State = 'IDLE' | 'TRIGGERING' | 'ECHOING';

export class HCSR04Logic extends BaseComponent {
    private pingState: HCSR04State = 'IDLE';
    private triggerStartCycles: number = 0;
    private distanceCm: number = 169.6; // Default distance
    
    // Injected by execute.ts
    private _simCpu?: any;
    private _simUpdatePhysics?: () => void;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        
        const dist = this.state?.distance ?? 169.6;
        this.distanceCm = dist;
        this.state = {
            ...this.state,
            distance: dist
        };
    }

    onEvent(event: any) {
        if (event.type === 'distance') {
            this.distanceCm = event.value;
            this.setState({ distance: this.distanceCm });
        }
    }

    // Called by execute.ts when Arduino changes a pin state
    onPinStateChange(pin: string, isHigh: boolean, cycles: number) {
        if (pin === 'TRIG') {
            if (isHigh && this.pingState === 'IDLE') {
                // Arduino started the trigger pulse
                this.pingState = 'TRIGGERING';
                this.triggerStartCycles = cycles;
            } else if (!isHigh && this.pingState === 'TRIGGERING') {
                // Arduino ended the trigger pulse
                const pulseLengthUs = (cycles - this.triggerStartCycles) / 16;
                
                // HC-SR04 requires a 10us pulse
                if (pulseLengthUs >= 10) {
                    this.startEchoSequence();
                } else {
                    this.pingState = 'IDLE'; // Invalid pulse, return to idle
                }
            }
        }
    }

    private startEchoSequence() {
        if (!this._simCpu) return; 

        // HC-SR04 typically takes about 250us to send the 8-cycle sonic burst before raising ECHO
        // 250us at 16MHz = 4000 cycles
        this._simCpu.addClockEvent(() => {
            this.beginEchoPulse();
        }, 4000);
    }

    private beginEchoPulse() {
        this.pingState = 'ECHOING';
        
        // Pull ECHO HIGH to start the pulse
        this.setPinVoltage('ECHO', 5.0);
        if (this._simUpdatePhysics) this._simUpdatePhysics();

        // Calculate echo duration based on distance
        // Formula: Time (us) = Distance (cm) * 58
        const echoDurationUs = this.distanceCm * 58;
        const echoCycles = Math.round(echoDurationUs * 16); 

        if (this._simCpu) {
            this._simCpu.addClockEvent(() => {
                this.endEchoPulse();
            }, echoCycles);
        }
    }

    private endEchoPulse() {
        this.pingState = 'IDLE';
        
        // Pull ECHO LOW to end the Echo pulse
        this.setPinVoltage('ECHO', 0.0);
        if (this._simUpdatePhysics) this._simUpdatePhysics();
    }

    update() {}
}
