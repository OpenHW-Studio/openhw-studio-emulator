import { BaseComponent } from '../components/BaseComponent';

export class I2CProtocol extends BaseComponent {
    private readonly address: number;
    private readonly readQueue: number[] = [];

    constructor(id: string, manifest: any) {
        super(id, manifest);
        
        const type = String(manifest?.type || '').toLowerCase();
        const defaultAddress = type === 'openhw-lcd2004-i2c' ? 0x27 : type === 'max30102' ? 0x57 : 0x3c;
        const rawAddress = Number(manifest?.attrs?.address ?? manifest?.attrs?.i2cAddress ?? manifest?.attrs?.addr ?? defaultAddress);
        this.address = Number.isFinite(rawAddress) ? (rawAddress & 0x7f) : defaultAddress;

        this.state = {
            ...this.state,
            i2cAddress: this.address,
            i2cRxBytes: 0,
            i2cTxBytes: 0,
            lastRegister: null,
            lastWriteData: [],
            lastReadData: [],
        };
    }

    getI2CAddress(): number {
        return this.address;
    }

    onI2CWriteRegister(reg: number, data: number[]): void {
        // To be overridden by subclasses
    }

    onI2CReadRequest(reg: number, count: number): number[] {
        // To be overridden by subclasses
        return [];
    }

    onI2CStopCondition(): void {
        // To be overridden by subclasses
    }

    onI2CStart(address: number, read: boolean): boolean {
        const targetAddress = this.getI2CAddress();
        const ack = (address & 0x7f) === targetAddress;
        
        if (ack) {
            this.state.lastReadMode = !!read;
            this.stateChanged = true;

            if (read) {
                // Populate read queue
                const reg = this.state.lastRegister !== null ? this.state.lastRegister : 0;
                // We don't know the exact count master will read, so we ask for a chunk (e.g. 32 bytes)
                const data = this.onI2CReadRequest(reg, 32) || [];
                this.readQueue.length = 0;
                this.readQueue.push(...data);
                this.state.lastReadData = [...data];
            } else {
                // Reset write buffer for new transaction
                this.state._currentWriteBuffer = [];
            }
        }
        
        return ack;
    }

    onI2CByte(_address: number, data: number): boolean {
        const byte = data & 0xff;
        this.state.i2cRxBytes = Number(this.state.i2cRxBytes || 0) + 1;
        this.stateChanged = true;
        
        if (!this.state._currentWriteBuffer) {
            this.state._currentWriteBuffer = [];
        }
        this.state._currentWriteBuffer.push(byte);
        
        return true;
    }

    onI2CReadByte(): number {
        const byte = this.readQueue.length > 0
            ? this.readQueue.shift()!
            : Number(this.state.defaultReadByte ?? 0xff) & 0xff;
            
        this.state.i2cTxBytes = Number(this.state.i2cTxBytes || 0) + 1;
        this.stateChanged = true;
        return byte;
    }
    
    onI2CStop(): void {
        const buffer = this.state._currentWriteBuffer || [];
        if (buffer.length > 0) {
            const reg = buffer[0];
            const data = buffer.slice(1);
            this.state.lastRegister = reg;
            this.state.lastWriteData = data;
            this.onI2CWriteRegister(reg, data);
        }
        this.state._currentWriteBuffer = [];
        this.onI2CStopCondition();
    }
}
