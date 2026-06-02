import { BaseComponent } from '../components/BaseComponent';

export class OneWireProtocol extends BaseComponent {
    protected scratchpad: number[] = [];

    constructor(id: string, manifest: any) {
        super(id, manifest);
        
        this.state = {
            ...this.state,
            ow_state: 'IDLE',
            ow_romCmd: null,
            ow_funcCmd: null,
            ow_byteBuffer: [],
        };
    }

    getROMAddress(): number[] {
        return [0x28, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0xFF]; // Default DS18B20 style ROM
    }

    onConvertTemperature(): void {
        // To be overridden by subclass
    }

    onReadScratchpad(): number[] {
        // To be overridden by subclass
        return this.scratchpad;
    }

    setScratchpad(data: number[]): void {
        this.scratchpad = [...data];
    }

    private readBitIndex = 0;
    private sendingBit = false;

    onOneWireReset(pinId: string, meta: any): void {
        this.state.ow_state = 'RESET';
        this.state.ow_byteBuffer = [];
        this.readBitIndex = 0;
        this.sendingBit = false;
        this.stateChanged = true;
    }

    onOneWireWriteBit(pinId: string, bit: number, meta: any): void {
        if (this.state.ow_state === 'IDLE') return;

        // If we just sent a bit by holding the line low, this write bit
        // is just the runner echoing our own pulse back to us. Ignore it.
        if (this.sendingBit) return;

        // If we are in DATA state and the command is a read (0xBE = Read Scratchpad),
        // the master is sending read slots. We should NOT accumulate these bits.
        if (this.state.ow_state === 'DATA' && this.state.ow_funcCmd === 0xBE) {
            return;
        }

        this.state.ow_byteBuffer.push(bit);
        
        if (this.state.ow_byteBuffer.length === 8) {
            const byte = this.state.ow_byteBuffer.reduce((acc: number, b: number, i: number) => acc | (b << i), 0);
            this.state.ow_byteBuffer = [];

            if (this.state.ow_state === 'RESET') {
                this.state.ow_romCmd = byte;
                this.state.ow_state = 'ROM_CMD';
                if (byte === 0xCC) { // SKIP ROM
                    this.state.ow_state = 'FUNCTION_CMD';
                }
            } else if (this.state.ow_state === 'FUNCTION_CMD') {
                this.state.ow_funcCmd = byte;
                this.state.ow_state = 'DATA';
                this.readBitIndex = 0; // Reset read index just in case
                
                if (byte === 0x44) {
                    this.onConvertTemperature();
                } else if (byte === 0xBE) {
                    this.setScratchpad(this.onReadScratchpad());
                }
            }
            this.stateChanged = true;
        }
    }

    onOneWireSlot(pinId: string, meta: any): void {
        // Clear echo flag if we receive a slot caused by our own pulse
        if (this.sendingBit) {
            this.sendingBit = false;
            return;
        }

        // This is called when the master creates a time slot.
        // If we need to send a 0, we pull the line LOW.
        if (this.state.ow_state === 'DATA' && this.state.ow_funcCmd === 0xBE) {
            const byteIndex = Math.floor(this.readBitIndex / 8);
            const bitOffset = this.readBitIndex % 8;
            
            if (byteIndex < this.scratchpad.length) {
                const byte = this.scratchpad[byteIndex];
                const outBit = (byte >> bitOffset) & 1;
                
                if (outBit === 0) {
                    this.sendingBit = true;
                    this.setPinVoltage(pinId, 0.0);
                    const simCpu = (this as any)._simCpu;
                    const simUpdatePhysics = (this as any)._simUpdatePhysics;
                    if (simUpdatePhysics) simUpdatePhysics();
                    
                    if (simCpu && typeof simCpu.addClockEvent === 'function') {
                        // Hold low for ~30us (480 cycles at 16MHz)
                        simCpu.addClockEvent(() => {
                            this.setPinVoltage(pinId, 5.0);
                            if (simUpdatePhysics) simUpdatePhysics();
                        }, 480);
                    } else {
                        // Fallback if cpu isn't injected
                        setTimeout(() => {
                            this.setPinVoltage(pinId, 5.0);
                            if (simUpdatePhysics) simUpdatePhysics();
                        }, 0);
                    }
                }
            }
            this.readBitIndex++;
        }
    }
}
