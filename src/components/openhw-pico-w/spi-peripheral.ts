export class SPIPeripheral {
    outgoingByte = 0;
    incomingByte = 0;
    bitIndex = 0;
    selected = false;
    paused = false;

    public onTransmit?: (byte: number) => void;

    // Callbacks to read/write hardware pins
    public getMosiValue: () => boolean;
    public setMisoValue: (val: boolean) => void;

    constructor(getMosiValue: () => boolean, setMisoValue: (val: boolean) => void) {
        this.getMosiValue = getMosiValue;
        this.setMisoValue = setMisoValue;
    }

    public sendByte(val: number) {
        this.outgoingByte = val;
    }

    public enable() {
        if (!this.selected) {
            this.bitIndex = 0;
            this.incomingByte = 0;
            this.selected = true;
            this.paused = false;
            this.driveMiso(); // Wokwi CYW43 PIO expects the first MISO bit ready before the first clock edge!
        }
    }

    public disable() {
        this.selected = false;
        this.paused = false;
        // Optionally high-Z MISO, but for CYW43 shared WL_D, the RP2040 handles direction.
    }

    private driveMiso() {
        // Output MSB first
        const bit = (this.outgoingByte & (1 << (7 - this.bitIndex))) !== 0;
        this.setMisoValue(bit);
    }

    private sampleMosi() {
        this.incomingByte = ((this.incomingByte << 1) | (this.getMosiValue() ? 1 : 0)) & 0xff;
        this.bitIndex++;
        if (this.bitIndex === 8) {
            this.bitIndex = 0;
            this.outgoingByte = 0; // Reset outgoing byte after it is sent
            if (this.onTransmit) {
                this.onTransmit(this.incomingByte);
            }
            this.incomingByte = 0;
        }
    }

    public onClockEdge(clockHigh: boolean) {
        if (!this.selected || this.paused) return;

        // Mode 0: CPOL=0, CPHA=0
        // Sample on rising edge, Drive on falling edge
        if (clockHigh) {
            this.sampleMosi();
        } else {
            this.driveMiso();
        }
    }
}
