import { BaseComponent } from '../components/BaseComponent';

/**
 * TwoWireProtocol — Abstraction for generic 2-wire serial interfaces (CLK/DIO).
 * This is similar to I2C but lacks addressing and uses LSB-first bit clocking,
 * commonly found in devices like the TM1637.
 */
export class TwoWireProtocol extends BaseComponent {
    private clkHigh: boolean = true;
    private dioHigh: boolean = true;
    private bitCount: number = 0;
    private currentByte: number = 0;
    private inTransaction = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
    }

    onTwoWireStart(): void {}
    
    onTwoWireStop(): void {}
    
    onTwoWireByteReceived(data: number): void {}

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number): void {
        super.onPinStateChange(pinId, isHigh, cpuCycles);

        if (pinId === 'DIO') {
            this.dioHigh = isHigh;
            // START/STOP conditions occur when DIO changes while CLK is HIGH
            if (this.clkHigh) {
                if (isHigh) {
                    this.inTransaction = false;
                    this.onTwoWireStop();
                } else {
                    this.inTransaction = true;
                    this.bitCount = 0;
                    this.currentByte = 0;
                    this.onTwoWireStart();
                }
            }
        } else if (pinId === 'CLK') {
            this.clkHigh = isHigh;
            // Sample data on CLK rising edge
            if (isHigh && this.inTransaction) {
                if (this.bitCount < 8) {
                    if (this.dioHigh) {
                        this.currentByte |= (1 << this.bitCount); // LSB first
                    }
                    this.bitCount++;
                } else if (this.bitCount === 8) {
                    // 9th bit is typically ACK, we just trigger the byte receive
                    this.onTwoWireByteReceived(this.currentByte);
                    this.bitCount = 0;
                    this.currentByte = 0;
                }
            }
        }
    }
}
