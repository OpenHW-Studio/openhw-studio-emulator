/**
 * HD44780 LCD Controller
 *
 * This is the real hardware chip used in almost every character LCD (1602, 2004, etc.).
 * It handles all HD44780 commands: display clear, cursor positioning, 4-bit/8-bit mode,
 * DDRAM addressing, and character data writes.
 *
 * ## Why this exists
 * All LCD components (parallel 1602, I2C 1602, I2C 2004) share the exact same
 * underlying command set. Rather than duplicating `processLCDCommand` in each file,
 * this controller centralises the logic.
 *
 * ## How to use
 * 1. Instantiate with your display dimensions (rows, cols).
 * 2. Call `feedByte(rs, data)` whenever a full HD44780 byte is decoded.
 * 3. Read `.lines` and `.stateChanged` to know when to update the UI.
 *
 * ## Creating a custom LCD display
 * Any new LCD component can use this controller regardless of protocol:
 *   - For I2C: extend `I2CProtocol`, decode the PCF8574 byte, call `hd44780.feedByte(rs, data)`.
 *   - For SPI: extend `SPIProtocol`, decode the SPI frame, call `hd44780.feedByte(rs, data)`.
 *   - For parallel pins: read D4–D7 on E falling edge, call `hd44780.feedByte(rs, data)`.
 *   - For any size: pass `rows` and `cols` to the constructor (e.g. 4 rows, 20 cols).
 */

export interface HD44780State {
    lines: string[];
    illuminated: boolean;
}

export class HD44780Controller {
    // Display dimensions
    readonly rows: number;
    readonly cols: number;

    // Internal state
    private linesData: string[];
    private cursorX = 0;
    private cursorY = 0;
    private mode4bit = false;
    private halfByte = 0;
    private isNibble = false;
    backlight = true;

    /** Set to true whenever the display content or backlight changes. */
    stateChanged = false;

    constructor(rows: number, cols: number) {
        this.rows = rows;
        this.cols = cols;
        this.linesData = Array.from({ length: rows }, () => ' '.repeat(cols));
    }

    /**
     * Feed a raw PCF8574 / IO-expander byte from an I2C LCD adapter.
     * This decodes the RS, RW, EN, BL bits and handles 4-bit nibble assembly.
     *
     * @param value  Raw byte from I2C (PCF8574 pin map: bit0=RS, bit1=RW, bit2=EN, bit3=BL, bits4-7=data nibble)
     * @param lastByte The previous raw byte (used to detect EN falling edge)
     * @returns The updated lastByte (caller should store it)
     */
    feedI2CByte(value: number, lastByte: number): number {
        const rs  = (value & 0x01) !== 0;
        const rw  = (value & 0x02) !== 0;
        const en  = (value & 0x04) !== 0;
        const bl  = (value & 0x08) !== 0;
        const lastEn = (lastByte & 0x04) !== 0;

        // Latch on EN falling edge (write only, rw=0)
        if (lastEn && !en && !rw) {
            const dataNibble = (value & 0xF0);
            if (!this.mode4bit) {
                this.processCommand(rs, dataNibble);
            } else {
                if (!this.isNibble) {
                    this.halfByte = dataNibble;
                    this.isNibble = true;
                } else {
                    const fullByte = this.halfByte | (dataNibble >> 4);
                    this.isNibble = false;
                    this.processCommand(rs, fullByte);
                }
            }
        }

        if (this.backlight !== bl) {
            this.backlight = bl;
            this.stateChanged = true;
        }

        return value; // return as new lastByte
    }

    /**
     * Feed a nibble from a parallel 4-bit bus (D4–D7 pins).
     * Call this on every EN falling edge.
     *
     * @param rs    State of the RS pin
     * @param d4    State of D4 pin
     * @param d5    State of D5 pin
     * @param d6    State of D6 pin
     * @param d7    State of D7 pin
     */
    feedParallelNibble(rs: boolean, d4: boolean, d5: boolean, d6: boolean, d7: boolean): void {
        const dataNibble =
            ((d7 ? 1 : 0) << 7) |
            ((d6 ? 1 : 0) << 6) |
            ((d5 ? 1 : 0) << 5) |
            ((d4 ? 1 : 0) << 4);

        if (!this.isNibble) {
            this.halfByte = dataNibble;
            this.isNibble = true;
        } else {
            const fullByte = this.halfByte | (dataNibble >> 4);
            this.isNibble = false;
            this.processCommand(rs, fullByte);
        }
    }

    /**
     * Process a fully assembled HD44780 command or data byte.
     *
     * @param rs   false = command, true = character data
     * @param data The full 8-bit HD44780 byte
     */
    processCommand(rs: boolean, data: number): void {
        if (!rs) {
            // ── COMMANDS ───────────────────────────────────────────────────
            if (data === 0x01) {
                // Clear display
                this.linesData = Array.from({ length: this.rows }, () => ' '.repeat(this.cols));
                this.cursorX = 0;
                this.cursorY = 0;
            } else if (data === 0x02 || data === 0x03) {
                // Return home
                this.cursorX = 0;
                this.cursorY = 0;
            } else if ((data & 0xFC) === 0x20) {
                // Function Set — 4-bit mode (DB4=0)
                this.mode4bit = true;
            } else if ((data & 0xFC) === 0x30) {
                // Function Set — 8-bit mode (DB4=1)
                this.mode4bit = false;
                this.isNibble = false;
            } else if ((data & 0x80) === 0x80) {
                // Set DDRAM address
                this.setDDRAMAddress(data & 0x7F);
            }
            // Other commands (display on/off, cursor blink, etc.) are accepted
            // but don't change visual state in this simulation.
        } else {
            // ── CHARACTER DATA ────────────────────────────────────────────
            if (this.cursorY < this.rows && this.cursorX < this.cols) {
                const lineArray = this.linesData[this.cursorY].split('');
                lineArray[this.cursorX] = String.fromCharCode(data);
                this.linesData[this.cursorY] = lineArray.join('');
                this.cursorX++;
            }
        }
        this.stateChanged = true;
    }

    /**
     * Map a raw DDRAM address to (row, col).
     * HD44780 DDRAM memory layout differs by display size.
     *
     * 16×2: Row 0 = 0x00–0x0F,  Row 1 = 0x40–0x4F
     * 20×4: Row 0 = 0x00–0x13,  Row 1 = 0x40–0x53
     *        Row 2 = 0x14–0x27,  Row 3 = 0x54–0x67
     */
    private setDDRAMAddress(addr: number): void {
        // Standard HD44780 DDRAM map (valid for 16×1, 16×2, 20×2, 20×4)
        const rowOffsets = [0x00, 0x40, this.cols, 0x40 + this.cols];
        for (let row = 0; row < this.rows; row++) {
            const base = rowOffsets[row];
            if (addr >= base && addr < base + this.cols) {
                this.cursorY = row;
                this.cursorX = addr - base;
                return;
            }
        }
    }

    /** Get current display lines (read-only snapshot). */
    getLines(): string[] {
        return [...this.linesData];
    }

    /** Get current backlight state. */
    getBacklight(): boolean {
        return this.backlight;
    }

    /** Clear the stateChanged flag (call after syncing state to component). */
    clearChanged(): void {
        this.stateChanged = false;
    }

    /** Get a complete state snapshot for the component's state object. */
    getState(): HD44780State {
        return {
            lines: this.getLines(),
            illuminated: this.backlight,
        };
    }
}
