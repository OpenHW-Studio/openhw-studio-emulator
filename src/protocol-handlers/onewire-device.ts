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

    onOneWireReset(pinId: string, meta: any): void {
        this.state.ow_state = 'RESET';
        this.state.ow_byteBuffer = [];
        this.stateChanged = true;
    }

    onOneWireWriteBit(pinId: string, bit: number, meta: any): void {
        if (this.state.ow_state === 'IDLE') return;

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
                
                if (byte === 0x44) {
                    this.onConvertTemperature();
                } else if (byte === 0xBE) {
                    this.setScratchpad(this.onReadScratchpad());
                }
            }
            this.stateChanged = true;
        }
    }
}
