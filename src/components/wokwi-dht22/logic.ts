import { BaseComponent } from '../BaseComponent';

type ProtocolState = 'IDLE' | 'WAKE_WAIT' | 'ACKING' | 'SENDING';

export class DHT22Logic extends BaseComponent {
    private protocolState: ProtocolState = 'IDLE';
    private wakeStartCycles: number = 0;
    
    private temperature: number = 24.0;
    private humidity: number = 50.0;
    
    private dataBits: boolean[] = [];
    private bitIndex: number = 0;

    // Injected by execute.ts
    private _simCpu?: any;
    private _simUpdatePhysics?: () => void;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        
        this.temperature = this.state?.temperature ?? 24.0;
        this.humidity = this.state?.humidity ?? 50.0;
        
        // Sensor has internal pull-up resistor (mostly) or requires external. 
        // Emulate idle high.
        this.setPinVoltage('SDA', 5.0);
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
        if (pin === 'SDA') {
            if (!isHigh && this.protocolState === 'IDLE') {
                // Arduino pulled LOW to initiate start signal
                this.protocolState = 'WAKE_WAIT';
                this.wakeStartCycles = cycles;
                
            } else if (isHigh && this.protocolState === 'WAKE_WAIT') {
                // Arduino released line. Calculate duration.
                const wakeUs = (cycles - this.wakeStartCycles) / 16;
                
                // DHT22 requests > 1ms (1000us) LOW logic. Some libraries do 1-2ms.
                // If it's over 800us, we consider it a valid wake request.
                if (wakeUs > 800) {
                    this.startAckSequence();
                } else {
                    this.protocolState = 'IDLE'; // False trigger
                }
            }
        }
    }

    private startAckSequence() {
        if (!this._simCpu) return;
        this.protocolState = 'ACKING';

        // Wait 20-40us for the master to release the bus completely before replying
        this._simCpu.addClockEvent(() => this.sendAckLow(), 30 * 16);
    }

    private sendAckLow() {
        // DHT pulls LOW for 80us
        this.setPinVoltage('SDA', 0);
        this._simUpdatePhysics?.();
        
        this._simCpu.addClockEvent(() => this.sendAckHigh(), 80 * 16);
    }

    private sendAckHigh() {
        // DHT pulls HIGH for 80us
        this.setPinVoltage('SDA', 5.0);
        this._simUpdatePhysics?.();
        
        this._simCpu.addClockEvent(() => {
            this.prepareDataBits();
            this.protocolState = 'SENDING';
            this.sendNextBit();
        }, 80 * 16);
    }

    private prepareDataBits() {
        // DHT22 format
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
            // Transmission finished. 50us LOW to end, then pull up to VCC (idle)
            this.setPinVoltage('SDA', 0);
            this._simUpdatePhysics?.();
            
            this._simCpu.addClockEvent(() => {
                this.protocolState = 'IDLE';
                this.setPinVoltage('SDA', 5.0);
                this._simUpdatePhysics?.();
            }, 50 * 16);
            return;
        }

        const bit = this.dataBits[this.bitIndex++];
        
        // Every bit starts with a 50us LOW signal
        this.setPinVoltage('SDA', 0);
        this._simUpdatePhysics?.();
        
        this._simCpu.addClockEvent(() => {
            // Data payload: 28us HIGH for '0', 70us HIGH for '1'
            this.setPinVoltage('SDA', 5.0);
            this._simUpdatePhysics?.();
            
            const highUs = bit ? 70 : 28;
            this._simCpu.addClockEvent(() => {
                this.sendNextBit();
            }, highUs * 16);
            
        }, 50 * 16);
    }

    update() {}
}
