import { BaseComponent } from '../BaseComponent';

type ProtocolState = 'IDLE' | 'WAKE_WAIT' | 'ACKING' | 'SENDING';

export class DHT22Logic extends BaseComponent {
    private protocolState: ProtocolState = 'IDLE';
    private wakeStartCycles: number = 0;
    
    private temperature: number = 24.0;
    private humidity: number = 50.0;
    
    private dataBits: boolean[] = [];
    private bitIndex: number = 0;

    // Guard: true while DHT is actively driving the DATA pin.
    // Prevents re-entrant onPinStateChange callbacks caused by the
    // repropagateAllVoltages feedback loop from disrupting the state machine.
    private _drivingBus: boolean = false;

    // Guard: prevents nested _simUpdatePhysics calls (re-entrancy protection).
    private _physicsCallDepth: number = 0;

    // Injected by execute.ts / avr-runner.ts
    private _simCpu?: any;
    private _simUpdatePhysics?: () => void;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        
        // Read initial values from manifest.attrs — these are available immediately
        // at construction time. this.state is empty at this point because avr-runner
        // merges cDef.attrs into inst.state AFTER calling new LogicClass().
        const attrs = manifest?.attrs || {};
        this.temperature = Number(attrs.temperature ?? this.state?.temperature ?? 24.0);
        this.humidity = Number(attrs.humidity ?? this.state?.humidity ?? 50.0);
        
        // Sync into state so telemetry sees the values immediately.
        this.setState({ temperature: this.temperature, humidity: this.humidity });
        
        // Sensor holds DATA high when idle (open-drain with pull-up).
        this.setPinVoltage('DATA', 5.0);
    }

    onEvent(event: any) {
        if (event.type === 'temperature') {
            this.temperature = event.value;
            this.setState({ temperature: this.temperature });
        } else if (event.type === 'humidity') {
            this.humidity = event.value;
            this.setState({ humidity: this.humidity });
        }
    }

    onPinStateChange(pin: string, isHigh: boolean, cycles: number) {
        // Ignore all external pin-state changes while we are actively driving
        // the bus (ACKING or SENDING). The repropagateAllVoltages feedback loop
        // can echo our own driven levels back to us, which would corrupt the
        // state machine (e.g. re-detecting a "wake" signal we drove ourselves).
        if (pin === 'DATA' && this._drivingBus) {
            return;
        }

        if (pin === 'DATA') {
            if (!isHigh && this.protocolState === 'IDLE') {
                // MCU pulled DATA LOW → start of a read request.
                this.protocolState = 'WAKE_WAIT';
                this.wakeStartCycles = cycles;
                
            } else if (isHigh && this.protocolState === 'WAKE_WAIT') {
                // MCU released the line (went HIGH/input).  Measure LOW duration.
                // At 16 MHz, 1 cpu cycle ≈ 62.5 ns → divide by 16 to get µs.
                // DHT22 spec: master holds LOW ≥ 1 ms (1000 µs).
                // We accept ≥ 500 µs to tolerate timing jitter in simulation.
                const wakeUs = (cycles - this.wakeStartCycles) / 16;
                
                if (wakeUs >= 500) {
                    this.startAckSequence();
                } else {
                    // Too short — not a valid start signal. Reset.
                    this.protocolState = 'IDLE';
                }
            }
        }
    }

    private safeUpdatePhysics() {
        if (!this._simUpdatePhysics) return;
        if (this._physicsCallDepth > 0) return; // Already in a propagation pass.
        this._physicsCallDepth++;
        try {
            this._simUpdatePhysics();
        } finally {
            this._physicsCallDepth--;
        }
    }

    private setDataPin(voltage: number) {
        this._drivingBus = true;
        this.setPinVoltage('DATA', voltage);
        this.safeUpdatePhysics();
    }

    private startAckSequence() {
        if (!this._simCpu) return;
        this.protocolState = 'ACKING';

        // DHT22 spec: sensor waits 20–40 µs after master releases bus,
        // then responds with its own 80 µs LOW + 80 µs HIGH acknowledgement.
        this._simCpu.addClockEvent(() => this.sendAckLow(), 30 * 16);
    }

    private sendAckLow() {
        // DHT pulls DATA LOW for 80 µs.
        this.setDataPin(0);
        this._simCpu.addClockEvent(() => this.sendAckHigh(), 80 * 16);
    }

    private sendAckHigh() {
        // DHT pulls DATA HIGH for 80 µs.
        this.setDataPin(5.0);
        
        this._simCpu.addClockEvent(() => {
            this.prepareDataBits();
            this.protocolState = 'SENDING';
            this.sendNextBit();
        }, 80 * 16);
    }

    private prepareDataBits() {
        // DHT22 40-bit format:
        //   Byte 0–1: Humidity × 10 (16-bit unsigned, MSB first)
        //   Byte 2–3: Temperature × 10 (16-bit, bit15 = sign, MSB first)
        //   Byte 4:   Checksum = (b0 + b1 + b2 + b3) & 0xFF
        const h = Math.round(this.humidity * 10);
        const tObj = Math.round(Math.abs(this.temperature) * 10);
        const tSign = this.temperature < 0 ? 0x80 : 0x00;
        
        const b0 = (h >> 8) & 0xFF;
        const b1 = h & 0xFF;
        const b2 = ((tObj >> 8) & 0x7F) | tSign;
        const b3 = tObj & 0xFF;
        const b4 = (b0 + b1 + b2 + b3) & 0xFF; // Checksum
        
        const bytes = [b0, b1, b2, b3, b4];
        this.dataBits = [];
        for (const b of bytes) {
            for (let i = 7; i >= 0; i--) {
                this.dataBits.push(!!((b >> i) & 1));
            }
        }
        this.bitIndex = 0;
    }

    private sendNextBit() {
        if (!this._simCpu) return;

        if (this.bitIndex >= 40) {
            // All 40 bits sent. End transmission: 50 µs LOW, then release bus HIGH.
            this.setDataPin(0);
            
            this._simCpu.addClockEvent(() => {
                this.protocolState = 'IDLE';
                this._drivingBus = false;   // Release the bus guard BEFORE going HIGH
                                             // so the CPU can detect the final HIGH.
                this.setPinVoltage('DATA', 5.0);
                this.safeUpdatePhysics();
            }, 50 * 16);
            return;
        }

        const bit = this.dataBits[this.bitIndex++];
        
        // Each bit starts with a 50 µs LOW pulse.
        this.setDataPin(0);
        
        this._simCpu.addClockEvent(() => {
            // Then goes HIGH: 26–28 µs for '0', 70 µs for '1'.
            this.setDataPin(5.0);
            
            const highUs = bit ? 70 : 28;
            this._simCpu.addClockEvent(() => {
                this.sendNextBit();
            }, highUs * 16);
            
        }, 50 * 16);
    }

    update() {}
}
