import { SPIProtocol, RadioEnvironment, RadioNode, RadioPacket } from '../../protocol-handlers/index';
import { cc1101GlueLoader, Cc1101WasmCore } from './glue';

// CC1101 Registers (Simplified for simulation)
const REG_FREQ2 = 0x0D;
const REG_FREQ1 = 0x0E;
const REG_FREQ0 = 0x0F;
const REG_MDMCFG4 = 0x10;
const REG_MDMCFG3 = 0x11;
const REG_MDMCFG2 = 0x12;

// Command Strobes
const STROBE_SRES = 0x30; // Reset
const STROBE_SRX  = 0x34; // Enable RX
const STROBE_STX  = 0x35; // Enable TX
const STROBE_SIDLE = 0x36; // Exit RX/TX
const STROBE_SFRX = 0x3A; // Flush RX FIFO
const STROBE_SFTX = 0x3B; // Flush TX FIFO

// FIFO Access
const BURST_TX_FIFO = 0x7F; // 0x3F | 0x40 (Burst)
const BURST_RX_FIFO = 0xFF; // 0x3F | 0xC0 (Read + Burst)

export class CC1101Logic extends SPIProtocol implements RadioNode {
    // RadioNode Implementation
    frequencyHz: number = 433000000;
    bandwidthHz: number = 200000;
    modulation: string = '2-FSK';
    magicInterop: boolean = false;

    // Internal State
    private rxQueue: Uint8Array[] = [];
    private txFifo: number[] = [];
    private stateMachine: 'IDLE' | 'RX' | 'TX' = 'IDLE';

    private activeCommand: number | null = null;
    private burstMode: boolean = false;

    // WASM protocol core (dual-runtime: when loaded, the core owns
    // registers/FIFOs/strobes/SPI exchange and the JS below stays a
    // reference fallback — same contract as MAX30102. Airwaves always
    // cross in JS via RadioEnvironment, shared across WASM instances).
    private wasm: Cc1101WasmCore | null = null;
    private wasmLoadAttempted = false;

    constructor(id: string, manifest: any, attrs: any) {
        super(id, manifest);
        
        this.magicInterop = attrs?.magicInterop === 'true';
        
        // Defaults to ~433MHz
        this.setRegister(REG_FREQ2, 0x10);
        this.setRegister(REG_FREQ1, 0xA7);
        this.setRegister(REG_FREQ0, 0x62);
        
        // Defaults to 2-FSK
        this.setRegister(REG_MDMCFG2, 0x02);

        this.updateRadioParams();
        this.setState({ core: 'js' });
        RadioEnvironment.register(this);
    }

    /** Lazy WASM core load — called by the runner once, never in tick. */
    async ensureWasmLoaded(): Promise<boolean> {
        if (this.wasm) return true;
        if (this.wasmLoadAttempted) return false;
        this.wasmLoadAttempted = true;
        try {
            const core = await cc1101GlueLoader.load(this.manifest);
            if (core) {
                this.wasm = core as Cc1101WasmCore;
                this.syncFromWasm();
                this.setState({ core: 'wasm' });
                this.stateChanged = true;
                return true;
            }
        } catch { /* fall through to JS reference */ }
        return false;
    }

    /** Mirror the WASM state view into fields, pins, and state. */
    private syncFromWasm(): void {
        try {
            const core = this.wasm;
            if (!core) return;
            const v = core.view();
            if (!v || v.length < 6) return;
            const states = ['IDLE', 'RX', 'TX'];
            this.stateMachine = (states[v[0]] ?? 'IDLE') as 'IDLE' | 'RX' | 'TX';
            this.frequencyHz = Number(v[5]) || this.frequencyHz;
            try { this.setPinVoltage('GDO0', v[4] === 1 ? 5.0 : 0.0); } catch { /* ignore */ }
            this.setState({
                state: this.stateMachine,
                rxQueueSize: Number(v[3]) || 0,
                txPending: v[1] === 1,
            });
            this.stateChanged = true;
        } catch { /* mirror never breaks sim */ }
    }

    /** Airwave-transmit the core's pending payload, if any. */
    private transmitFromWasm(): void {
        try {
            const core = this.wasm;
            if (!core) return;
            const payload = core.txPayload();
            if (!payload || payload.length === 0) return;
            RadioEnvironment.transmit({
                senderId: this.id,
                frequencyHz: this.frequencyHz,
                bandwidthHz: this.bandwidthHz,
                modulation: this.modulation,
                txPowerDbm: 10,
                payload: payload
            });
            core.txConsumed();
            this.syncFromWasm();
        } catch { /* transmit never breaks sim */ }
    }

    // Frame chip-select is CSN: the SPIProtocol autodetect has no CSN
    // entry point for this pinout and would fall back to a ghost 'CS',
    // so transaction boundaries (TX FIFO queueing) would never fire.
    getCSPinName(): string { return 'CSN'; }

    onDestroy() {
        RadioEnvironment.unregister(this);
    }

    private updateRadioParams() {
        const freq2 = this.getRegister(REG_FREQ2);
        const freq1 = this.getRegister(REG_FREQ1);
        const freq0 = this.getRegister(REG_FREQ0);
        
        // FXOSC = 26 MHz. Freq = (26e6 / 65536) * FREQ[23:0]
        const freqWord = (freq2 << 16) | (freq1 << 8) | freq0;
        this.frequencyHz = (26000000 / 65536) * freqWord;
        
        const mdm2 = this.getRegister(REG_MDMCFG2);
        const modFormat = (mdm2 >> 4) & 0x07;
        switch (modFormat) {
            case 0: this.modulation = '2-FSK'; break;
            case 1: this.modulation = 'GFSK'; break;
            case 3: this.modulation = 'ASK/OOK'; break;
            case 4: this.modulation = '4-FSK'; break;
            case 7: this.modulation = 'MSK'; break;
            default: this.modulation = '2-FSK'; break;
        }
    }

    onRadioPacketReceived(packet: RadioPacket, isJammed: boolean): void {
        // WASM path: the core applies the RX-state gate and GDO0 itself.
        if (this.wasm) {
            try {
                this.wasm.radioRx(packet.payload);
                this.syncFromWasm();
            } catch { /* ignore */ }
            return;
        }
        if (isJammed || this.stateMachine !== 'RX') return;
        
        // Place raw payload into RX queue
        this.rxQueue.push(packet.payload);
        
        // Trigger GDO0 / GDO2 if configured (simplified to GDO0 active HIGH)
        this.setPinVoltage('GDO0', 5.0);
    }

    // CSN edge tracking for the WASM path (base handles the JS reference
    // path via getCSPinName). The core owns transaction boundaries.
    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number): void {
        if (this.wasm) {
            try {
                if (pinId === 'CSN') this.wasm.cs(!isHigh);
                this.syncFromWasm();
            } catch { /* ignore */ }
            return;
        }
        super.onPinStateChange(pinId, isHigh, cpuCycles);
    }

    onCSAssert() {
        if (this.wasm) { try { this.wasm.cs(true); } catch { /* ignore */ } return; }
        this.activeCommand = null;
        this.burstMode = false;
    }

    onSPIByteExchange(value: number, index: number): number {
        // WASM path: strobes/FIFOs/registers in the core. STX fires
        // mid-transaction (no pin edge), so check airwaves after every byte.
        if (this.wasm) {
            try {
                const miso = this.wasm.spiByte(value);
                this.transmitFromWasm();
                this.syncFromWasm();
                return miso;
            } catch { return 0xFF; }
        }
        if (index === 0) {
            this.activeCommand = value;
            
            // Strobes
            if (value >= 0x30 && value <= 0x3D) {
                this.handleStrobe(value);
                return 0x0F; // Status byte (simplified)
            }
            
            // FIFO access
            if (value === BURST_TX_FIFO || value === 0x3F) {
                this.activeCommand = BURST_TX_FIFO;
                return 0x0F;
            }
            if (value === BURST_RX_FIFO || value === 0xBF) {
                this.activeCommand = BURST_RX_FIFO;
                return 0x0F;
            }
            
            return 0x0F;
        }

        if (this.activeCommand !== null) {
            // FIFO modes FIRST: 0x7F/0x3F have bit7 clear and would
            // otherwise misclassify as register writes below (observed:
            // TX FIFO stayed empty, STX transmitted nothing).
            if (this.activeCommand === BURST_TX_FIFO) {
                this.txFifo.push(value);
                return 0x0F;
            }

            // Write Register
            if ((this.activeCommand & 0x80) === 0) {
                const reg = this.activeCommand & 0x3F;
                this.setRegister(reg, value);
                this.updateRadioParams();
                return 0x00;
            }

            // Read Register
            if ((this.activeCommand & 0x80) !== 0 && this.activeCommand !== BURST_RX_FIFO) {
                const reg = this.activeCommand & 0x3F;
                return this.getRegister(reg) || 0;
            }

            // Read RX FIFO
            if (this.activeCommand === BURST_RX_FIFO) {
                if (this.rxQueue.length > 0) {
                    const payload = this.rxQueue[0];
                    // Very simplified FIFO extraction (doesn't track internal pointers)
                    const out = payload[index - 1] !== undefined ? payload[index - 1] : 0x00;
                    if (index === payload.length) {
                        this.rxQueue.shift();
                        this.setPinVoltage('GDO0', 0.0); // Clear interrupt
                    }
                    return out;
                }
                return 0x00;
            }
        }
        return 0x00;
    }

    private handleStrobe(cmd: number) {
        switch (cmd) {
            case STROBE_SRES:
                this.stateMachine = 'IDLE';
                this.txFifo = [];
                this.rxQueue = [];
                break;
            case STROBE_SRX:
                this.stateMachine = 'RX';
                break;
            case STROBE_STX:
                this.stateMachine = 'TX';
                this.transmitFIFO();
                break;
            case STROBE_SIDLE:
                this.stateMachine = 'IDLE';
                break;
            case STROBE_SFRX:
                this.rxQueue = [];
                this.setPinVoltage('GDO0', 0.0);
                break;
            case STROBE_SFTX:
                this.txFifo = [];
                break;
        }
    }

    private transmitFIFO() {
        if (this.txFifo.length > 0) {
            const payload = new Uint8Array(this.txFifo);
            RadioEnvironment.transmit({
                senderId: this.id,
                frequencyHz: this.frequencyHz,
                bandwidthHz: this.bandwidthHz,
                modulation: this.modulation,
                txPowerDbm: 10,
                payload: payload
            });
            this.txFifo = [];
            
            // CC1101 automatically returns to IDLE or RX depending on MCSM1, we'll default to IDLE
            this.stateMachine = 'IDLE';
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            core: this.wasm ? 'wasm' : 'js',
            state: this.stateMachine,
            frequency: `${(this.frequencyHz / 1000000).toFixed(2)} MHz`,
            modulation: this.modulation,
            rxQueueSize: Number((this.state as any)?.rxQueueSize ?? this.rxQueue.length),
            txFifoSize: this.txFifo.length,
            interruptPin: this.getPinVoltage('GDO0') > 2.5 ? 'HIGH' : 'LOW'
        });
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: powered} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {powered: (s.powered ? 1 : 0)},
        };
    }
    validate(_component: any, _graph: Map<string, string[]>) {
        return null;
    }
}
