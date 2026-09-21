import { BaseComponent } from '../components/BaseComponent';

export class UARTProtocol extends BaseComponent {
    protected rxBuffer: number[] = [];
    protected txQueue: number[] = [];
    private baudRate: number;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        
        this.baudRate = Number(manifest?.attrs?.baudRate ?? 9600);
        
        this.state = {
            ...this.state,
            uartRxBytes: 0,
            uartTxBytes: 0,
            lastRxByte: null,
            baudRate: this.baudRate,
        };
    }

    getTXPinName(): string {
        return 'TXD';
    }

    onUARTByte(byte: number): void {
        // To be overridden
    }

    getNextTXByte(): number | null {
        // To be overridden
        return this.txQueue.length > 0 ? this.txQueue.shift()! : null;
    }

    update(): void {
        // Here we could implement the poll loop to drive outbound TX queue
        // by pushing bytes to the serial line.
        // For software serial decode, we rely on the runner calling `onOneWirePulseLow`/`onPinStateChange`
        // or a direct `serialRx` injection if wired to hardware UART.
    }
    
    // Fallback if the runner uses direct injection
    serialRx(value: number): void {
        const byte = value & 0xff;
        this.state.uartRxBytes = Number(this.state.uartRxBytes || 0) + 1;
        this.state.lastRxByte = byte;
        this.stateChanged = true;
        this.onUARTByte(byte);
    }
}

/**
 * UartBusFramer — composition helper for WASM-heavy components (§12.4).
 * Pure byte counting + event fan-out (no update/WASM knowledge). A
 * WASM-heavy UART component extends WasmComponent DIRECTLY, owns a
 * UartBusFramer, feeds RX bytes via pushByte(), and routes via
 * routeUARTByte(); the TX queue stays plain JS (strings never cross).
 */
export interface UartFrameEvents {
    onByte?(byte: number, rxIndex: number): void;
}

export class UartBusFramer {
    private rxCount = 0;
    constructor(private readonly events: UartFrameEvents) {}

    /** Feed one RX byte; returns the 0-based RX index. */
    pushByte(data: number): number {
        const byte = data & 0xff;
        const idx = this.rxCount++;
        this.events.onByte?.(byte, idx);
        return idx;
    }

    get rxBytes(): number { return this.rxCount; }
}
