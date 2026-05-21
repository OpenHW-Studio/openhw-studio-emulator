import { SPIProtocol, RadioEnvironment, RadioNode, RadioPacket } from '../../protocol-handlers/index';

// nRF24L01+ Registers
const REG_CONFIG      = 0x00;
const REG_EN_AA       = 0x01;
const REG_EN_RXADDR   = 0x02;
const REG_SETUP_AW    = 0x03;
const REG_SETUP_RETR  = 0x04;
const REG_RF_CH       = 0x05;
const REG_RF_SETUP    = 0x06;
const REG_STATUS      = 0x07;
const REG_RX_PW_P0    = 0x11;
const REG_FIFO_STATUS = 0x17;

// Commands
const CMD_R_REGISTER    = 0x00; // + Register address
const CMD_W_REGISTER    = 0x20; // + Register address
const CMD_R_RX_PAYLOAD  = 0x61;
const CMD_W_TX_PAYLOAD  = 0xA0;
const CMD_FLUSH_TX      = 0xE1;
const CMD_FLUSH_RX      = 0xE2;
const CMD_REUSE_TX_PL   = 0xE3;
const CMD_NOP           = 0xFF;

export class NRF24L01Logic extends SPIProtocol implements RadioNode {
    // RadioNode Implementation
    frequencyHz: number = 2400000000;
    bandwidthHz: number = 1000000; // 1MHz or 2MHz based on RF_SETUP
    modulation: string = 'GFSK';
    magicInterop: boolean = false;

    // Internal State
    private rxQueue: Uint8Array[] = [];
    private txQueue: Uint8Array[] = [];
    private ceHigh: boolean = false;

    // SPI Transaction State
    private activeCommand: number | null = null;
    private activeReg: number = 0;
    private payloadBuffer: number[] = [];

    constructor(id: string, manifest: any, attrs: any) {
        super(id, manifest);
        
        this.magicInterop = attrs?.magicInterop === 'true';
        
        // Setup initial default registers matching real hardware
        this.setRegister(REG_CONFIG, 0x08);
        this.setRegister(REG_EN_AA, 0x3F);
        this.setRegister(REG_EN_RXADDR, 0x03);
        this.setRegister(REG_SETUP_AW, 0x03);
        this.setRegister(REG_SETUP_RETR, 0x03);
        this.setRegister(REG_RF_CH, 0x02); // 2402 MHz
        this.setRegister(REG_RF_SETUP, 0x0E); // 2Mbps, 0dBm
        this.setRegister(REG_STATUS, 0x0E);
        this.setRegister(REG_RX_PW_P0, 0x00);
        this.setRegister(REG_FIFO_STATUS, 0x11);

        this.updateRadioParams();
        
        // Register this node to the global airwaves
        RadioEnvironment.register(this);
    }

    onDestroy() {
        RadioEnvironment.unregister(this);
    }

    private updateRadioParams() {
        const rfCh = this.getRegister(REG_RF_CH) & 0x7F;
        this.frequencyHz = 2400000000 + (rfCh * 1000000);
        
        const rfSetup = this.getRegister(REG_RF_SETUP);
        const dataRate = (rfSetup & 0x28) === 0x20 ? 250000 : ((rfSetup & 0x08) ? 2000000 : 1000000);
        this.bandwidthHz = dataRate > 1000000 ? 2000000 : 1000000;
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        super.onPinStateChange(pinId, isHigh, cpuCycles);
        if (pinId === 'CE') {
            this.ceHigh = isHigh;
            if (isHigh) {
                this.checkTx();
            }
        }
    }

    private checkTx() {
        // If CE goes high and we have Tx payloads, transmit them!
        if (this.txQueue.length > 0) {
            const payload = this.txQueue.shift();
            if (payload) {
                // Transmit over the airwaves
                RadioEnvironment.transmit({
                    senderId: this.id,
                    frequencyHz: this.frequencyHz,
                    bandwidthHz: this.bandwidthHz,
                    modulation: this.modulation,
                    txPowerDbm: 0,
                    payload: payload
                });

                // Simulate immediate TX_DS (Data Sent) IRQ
                const status = this.getRegister(REG_STATUS);
                this.setRegister(REG_STATUS, status | 0x20); // TX_DS bit
                this.updateIRQ();
            }
        }
    }

    onRadioPacketReceived(packet: RadioPacket, isJammed: boolean): void {
        if (isJammed) return; // Drop corrupted packets in strict mode

        // Check if we are in RX mode (CONFIG bit 0 = 1) and CE is HIGH
        const config = this.getRegister(REG_CONFIG);
        if ((config & 0x01) && this.ceHigh) {
            if (this.rxQueue.length < 3) { // 3-level FIFO
                this.rxQueue.push(packet.payload);
                
                // Set RX_DR (Data Ready) IRQ
                const status = this.getRegister(REG_STATUS);
                this.setRegister(REG_STATUS, status | 0x40);
                this.updateIRQ();
            }
        }
    }

    private updateIRQ() {
        const status = this.getRegister(REG_STATUS);
        const config = this.getRegister(REG_CONFIG);
        // Active LOW interrupt
        const irqActive = ((status & 0x40) && !(config & 0x40)) || // RX_DR
                          ((status & 0x20) && !(config & 0x20)) || // TX_DS
                          ((status & 0x10) && !(config & 0x10));   // MAX_RT

        this.setPinVoltage('IRQ', irqActive ? 0.0 : 5.0);
    }

    onCSAssert() {
        this.activeCommand = null;
        this.payloadBuffer = [];
    }

    onSPIByteExchange(value: number, index: number): number {
        // First byte is always the command, we reply with STATUS register
        if (index === 0) {
            this.activeCommand = value;
            this.activeReg = value & 0x1F;
            
            // Execute flush commands immediately
            if (this.activeCommand === CMD_FLUSH_TX) this.txQueue = [];
            if (this.activeCommand === CMD_FLUSH_RX) this.rxQueue = [];
            
            return this.getRegister(REG_STATUS);
        }

        // Subsequent bytes depend on the command
        if (this.activeCommand !== null) {
            const cmdMasked = this.activeCommand & 0xE0;
            
            if (cmdMasked === CMD_R_REGISTER) {
                // Multi-byte registers (like RX_ADDR_P0) are handled by getRegister chunking or simple return
                return this.getRegister(this.activeReg + (index - 1)) || 0; 
                // Note: Simplified logic. True nRF24 multi-byte read stays on same register address.
            }
            
            if (cmdMasked === CMD_W_REGISTER) {
                this.setRegister(this.activeReg, value);
                this.updateRadioParams();
                return 0x00;
            }

            if (this.activeCommand === CMD_W_TX_PAYLOAD) {
                this.payloadBuffer.push(value);
                return 0x00;
            }

            if (this.activeCommand === CMD_R_RX_PAYLOAD) {
                if (this.rxQueue.length > 0) {
                    const payload = this.rxQueue[0];
                    const out = payload[index - 1] !== undefined ? payload[index - 1] : 0x00;
                    // If we read the whole payload, pop it
                    if (index === payload.length) {
                        this.rxQueue.shift();
                    }
                    return out;
                }
                return 0x00;
            }
        }
        
        return 0x00;
    }

    onCSDeassert(meta: any) {
        if (this.activeCommand === CMD_W_TX_PAYLOAD && this.payloadBuffer.length > 0) {
            this.txQueue.push(new Uint8Array(this.payloadBuffer));
            if (this.ceHigh) this.checkTx();
        }
        this.payloadBuffer = [];
        this.activeCommand = null;
    }

    onCustomTelemetry() {
        const config = this.getRegister(REG_CONFIG);
        const mode = (config & 0x01) ? 'RX' : 'TX';
        const pwr = (config & 0x02) ? 'ON' : 'OFF';

        this.setCustomTelemetry({
            power: pwr,
            mode: mode,
            frequency: `${this.frequencyHz / 1000000} MHz`,
            rxQueueSize: this.rxQueue.length,
            txQueueSize: this.txQueue.length,
            statusReg: `0x${this.getRegister(REG_STATUS).toString(16).padStart(2, '0')}`
        });
    }
}
