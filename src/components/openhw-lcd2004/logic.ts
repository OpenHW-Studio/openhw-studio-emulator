import { BaseComponent } from '../BaseComponent';

export class Lcd2004Logic extends BaseComponent {
    private backlight = true;
    private mode4bit = true;
    private cursorX = 0;
    private cursorY = 0;
    private linesData: string[] = [
        "                    ", 
        "                    ",
        "                    ",
        "                    "
    ];
    private halfByte = 0;
    private isNibble = false;
    private pinStates: Record<string, boolean> = {
        rs: false, rw: false, e: false,
        d0: false, d1: false, d2: false, d3: false,
        d4: false, d5: false, d6: false, d7: false,
        a: true, k: false
    };

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { lines: [...this.linesData], illuminated: this.backlight };
    }

    onPinStateChange(pinId: string, isHigh: boolean, _cpuCycles: number): void {
        const pin = pinId.toLowerCase();
        const wasHigh = this.pinStates[pin];
        this.pinStates[pin] = isHigh;

        if (pin === 'a') {
            if (this.backlight !== isHigh) {
                this.backlight = isHigh;
                this.stateChanged = true;
                this.updateState();
            }
            return;
        }

        // Falling edge of E latches data
        if (pin === 'e' && wasHigh && !isHigh) {
            const d4 = this.pinStates.d4 ? 1 : 0;
            const d5 = this.pinStates.d5 ? 1 : 0;
            const d6 = this.pinStates.d6 ? 1 : 0;
            const d7 = this.pinStates.d7 ? 1 : 0;
            const dataNibble = (d7 << 7) | (d6 << 6) | (d5 << 5) | (d4 << 4);

            const rs = this.pinStates.rs;

            if (!this.isNibble) {
                this.halfByte = dataNibble;
                this.isNibble = true;
            } else {
                const fullByte = this.halfByte | (dataNibble >> 4);
                this.isNibble = false;
                this.processLCDCommand(rs, fullByte);
            }
            this.updateState();
        }
    }

    processLCDCommand(rs: boolean, data: number) {
        if (!rs) {
            if (data === 0x01) { // Clear display
                this.linesData = [
                    "                    ", 
                    "                    ",
                    "                    ",
                    "                    "
                ];
                this.cursorX = 0;
                this.cursorY = 0;
            } else if (data === 0x02 || data === 0x03) { // Return home
                this.cursorX = 0;
                this.cursorY = 0;
            } else if ((data & 0xF0) === 0x20) { // 4-bit mode
                this.mode4bit = true;
            } else if ((data & 0xF0) === 0x30) { // 8-bit mode
                this.mode4bit = false;
                this.isNibble = false;
            } else if ((data & 0x80) === 0x80) { 
                const addr = data & 0x7F;
                if (addr >= 0x00 && addr < 0x14) { this.cursorY = 0; this.cursorX = addr; }
                else if (addr >= 0x40 && addr < 0x54) { this.cursorY = 1; this.cursorX = addr - 0x40; }
                else if (addr >= 0x14 && addr < 0x28) { this.cursorY = 2; this.cursorX = addr - 0x14; }
                else if (addr >= 0x54 && addr < 0x68) { this.cursorY = 3; this.cursorX = addr - 0x54; }
            }
        } else {
            if (this.cursorY < 4 && this.cursorX < 20) {
                const lineArray = this.linesData[this.cursorY].split("");
                lineArray[this.cursorX] = String.fromCharCode(data);
                this.linesData[this.cursorY] = lineArray.join("");
                this.cursorX++;
            }
        }
        this.stateChanged = true;
    }

    updateState() {
        this.state.lines = [...this.linesData];
        this.state.illuminated = this.backlight;
    }

    update(cpuCycles: number, wires: any, allComponents: any) {}

    onCustomTelemetry() {
        const textContent = this.linesData.map(l => l.trimEnd()).join("\n").trimEnd();
        this.setCustomTelemetry({
            textContent: textContent || "<empty>",
            backlight: this.backlight,
            lineCount: 4,
            charsPerLine: 20,
        });
    }

    getSyncState() {
        return { ...this.state };
    }
}
