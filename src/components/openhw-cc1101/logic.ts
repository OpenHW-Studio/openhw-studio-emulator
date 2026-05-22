import { SPIProtocol, RadioEnvironment, RadioNode, RadioPacket } from '../../protocol-handlers/index';

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
        RadioEnvironment.register(this);
    }

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
        if (isJammed || this.stateMachine !== 'RX') return;
        
        // Place raw payload into RX queue
        this.rxQueue.push(packet.payload);
        
        // Trigger GDO0 / GDO2 if configured (simplified to GDO0 active HIGH)
        this.setPinVoltage('GDO0', 5.0);
    }

    onCSAssert() {
        this.activeCommand = null;
        this.burstMode = false;
    }

    onSPIByteExchange(value: number, index: number): number {
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

            // Write TX FIFO
            if (this.activeCommand === BURST_TX_FIFO) {
                this.txFifo.push(value);
                return 0x0F;
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
            state: this.stateMachine,
            frequency: `${(this.frequencyHz / 1000000).toFixed(2)} MHz`,
            modulation: this.modulation,
            rxQueueSize: this.rxQueue.length,
            txFifoSize: this.txFifo.length,
            interruptPin: this.getPinVoltage('GDO0') > 2.5 ? 'HIGH' : 'LOW'
        });
    }
}
