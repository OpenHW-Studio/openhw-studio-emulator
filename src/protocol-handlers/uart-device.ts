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
