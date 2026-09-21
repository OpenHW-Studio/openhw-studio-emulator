import { BaseComponent } from '../components/BaseComponent';

export class I2CProtocol extends BaseComponent {
    // NOTE (§12.4): this class is the PURE-TS bus layer (start/stop/read-
    // queue engine). It deliberately does NOT extend WasmComponent — same
    // reason as SPIProtocol: all I2C components must work with zero WASM
    // involvement; WASM-heavy components compose via I2cBusFramer.
    private readonly address: number;
    private readonly readQueue: number[] = [];

    constructor(id: string, manifest: any) {
        super(id, manifest);
        
        const type = String(manifest?.type || '').toLowerCase();
        const defaultAddress =
            type === 'openhw-lcd2004-i2c' || type === 'wokwi-lcd2004-i2c' || type === 'openhw-lcd1602-i2c' || type === 'wokwi-lcd1602-i2c' ? 0x27 :
            type === 'max30102' ? 0x57 :
            type === 'openhw-bmp180' || type === 'wokwi-bmp180' || type === 'openhw-bmp180-breakout' || type === 'wokwi-bmp180-breakout' ? 0x77 :
            type === 'openhw-mpu6050' || type === 'wokwi-mpu6050' ? 0x68 :
            type === 'openhw-ds1307-rtc' || type === 'wokwi-ds1307-rtc' ? 0x68 :
            0x3c;
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

/**
 * I2cBusFramer — composition helper for WASM-heavy components (§12.4).
 * Same rationale as SpiBusFramer: a WASM-heavy component extends
 * WasmComponent DIRECTLY and owns an I2cBusFramer for pure framing
 * (address match, write-buffer assembly, read-queue), so there is exactly
 * ONE dispatch owner for every bus event — never a protocol base class
 * AND a WASM adapter fighting over the same onI2CByte call.
 */
export interface I2cFrameEvents {
    onWriteRegister?(reg: number, data: number[]): void;
    onReadRequest?(reg: number, count: number): number[];
    onStop?(): void;
}

export class I2cBusFramer {
    private writeBuffer: number[] = [];
    private readQueue: number[] = [];
    private lastRegister: number | null = null;
    constructor(
        private readonly address: number,
        private readonly events: I2cFrameEvents,
    ) {}

    getAddress(): number { return this.address; }

    /** START condition; returns ACK. Read mode pre-fills the read queue. */
    start(address: number, read: boolean): boolean {
        if ((address & 0x7f) !== this.address) return false;
        if (read) {
            const reg = this.lastRegister ?? 0;
            const data = this.events.onReadRequest?.(reg, 32) || [];
            this.readQueue = [...data];
        } else {
            this.writeBuffer = [];
        }
        return true;
    }

    /** One write byte; always ACKs (matches I2CProtocol.onI2CByte). */
    pushByte(data: number): boolean {
        this.writeBuffer.push(data & 0xff);
        return true;
    }

    /** One read byte (read queue, default 0xFF). */
    readByte(defaultByte = 0xff): number {
        return this.readQueue.length > 0 ? this.readQueue.shift()! : (defaultByte & 0xff);
    }

    /** STOP condition: decode reg+data, fire events. */
    stop(): void {
        if (this.writeBuffer.length > 0) {
            const reg = this.writeBuffer[0];
            const data = this.writeBuffer.slice(1);
            this.lastRegister = reg;
            this.events.onWriteRegister?.(reg, data);
        }
        this.writeBuffer = [];
        this.events.onStop?.();
    }
}
