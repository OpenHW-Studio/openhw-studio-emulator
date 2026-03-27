import { BaseComponent } from '../BaseComponent';

export class LCD1602Logic extends BaseComponent {
    private displayBuffer: string[][];
    private cursorRow: number;
    private cursorCol: number;
    private displayOn: boolean;
    private cursorOn: boolean;
    private blinkOn: boolean;
    private entryMode: number;
    private displayControl: number;
    private functionSet: number;
    private ddramAddress: number;
    private is4BitMode: boolean;
    private nibbleBuffer: number;
    private waitingForSecondNibble: boolean;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        
        // Initialize 16x2 display buffer
        this.displayBuffer = [
            Array(16).fill(' '),
            Array(16).fill(' ')
        ];
        
        this.cursorRow = 0;
        this.cursorCol = 0;
        this.displayOn = true;
        this.cursorOn = true;
        this.blinkOn = false;
        this.entryMode = 0x06; // Increment cursor, no display shift
        this.displayControl = 0x0C; // Display on, cursor off, blink off
        this.functionSet = 0x28; // 4-bit, 2 lines, 5x8 dots
        this.ddramAddress = 0;
        this.is4BitMode = true;
        this.nibbleBuffer = 0;
        this.waitingForSecondNibble = false;
        
        this.state = {
            displayBuffer: this.displayBuffer,
            cursorRow: this.cursorRow,
            cursorCol: this.cursorCol,
            displayOn: this.displayOn,
            cursorOn: this.cursorOn,
            blinkOn: this.blinkOn,
            backlightOn: true
        };
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        // Check RS pin to determine if we're receiving commands or data
        const rsPin = this.getPinVoltage('RS');
        const rwPin = this.getPinVoltage('RW');
        const enablePin = this.getPinVoltage('E');
        
        // Check for backlight power
        const backlightPower = this.getPinVoltage('A') > 2.5;
        if (backlightPower !== this.state.backlightOn) {
            this.setState({ backlightOn: backlightPower });
        }
        
        // Simple LCD simulation - in real implementation would handle proper timing
        if (enablePin > 2.5 && rwPin < 0.5) { // Write mode and enable high
            this.processInput(rsPin > 2.5);
        }
    }

    private processInput(isData: boolean) {
        // Read data pins D4-D7 for 4-bit mode
        let data = 0;
        for (let i = 4; i < 8; i++) {
            const pinVoltage = this.getPinVoltage(`D${i}`);
            if (pinVoltage > 2.5) {
                data |= (1 << i);
            }
        }
        
        // Shift down to get 4-bit value
        const nibble = data >> 4;
        
        if (this.is4BitMode) {
            if (this.waitingForSecondNibble) {
                // Combine with first nibble
                const fullByte = (this.nibbleBuffer << 4) | nibble;
                this.waitingForSecondNibble = false;
                
                if (isData) {
                    this.writeCharacter(fullByte);
                } else {
                    this.processCommand(fullByte);
                }
            } else {
                // Store first nibble and wait for second
                this.nibbleBuffer = nibble;
                this.waitingForSecondNibble = true;
            }
        } else {
            // 8-bit mode (original logic)
            if (isData) {
                this.writeCharacter(data);
            } else {
                this.processCommand(data);
            }
        }
    }

    private writeCharacter(charCode: number) {
        if (this.cursorCol < 16 && this.cursorRow < 2) {
            this.displayBuffer[this.cursorRow][this.cursorCol] = String.fromCharCode(charCode);
            this.incrementCursor();
            this.updateDisplayState();
        }
    }

    private processCommand(command: number) {
        // LCD command processing
        if ((command & 0x80) === 0) {
            // Set DDRAM address
            this.ddramAddress = command & 0x7F;
            this.setCursorFromAddress();
        } else if (command === 0x01) {
            // Clear display
            this.clearDisplay();
        } else if (command === 0x02) {
            // Return home
            this.returnHome();
        } else if ((command & 0x08) !== 0) {
            // Display control
            this.displayControl = command;
            this.displayOn = (command & 0x04) !== 0;
            this.cursorOn = (command & 0x02) !== 0;
            this.blinkOn = (command & 0x01) !== 0;
            this.updateDisplayState();
        } else if ((command & 0x20) !== 0) {
            // Function set
            this.functionSet = command;
            // Check if 4-bit mode is set
            if ((command & 0x10) === 0) {
                this.is4BitMode = true;
            } else {
                this.is4BitMode = false;
            }
        } else if ((command & 0x40) !== 0) {
            // Set CGRAM address
        } else if ((command & 0x04) !== 0) {
            // Entry mode set
            this.entryMode = command;
        }
    }

    private clearDisplay() {
        this.displayBuffer = [
            Array(16).fill(' '),
            Array(16).fill(' ')
        ];
        this.cursorRow = 0;
        this.cursorCol = 0;
        this.updateDisplayState();
    }

    private returnHome() {
        this.cursorRow = 0;
        this.cursorCol = 0;
        this.ddramAddress = 0;
        this.updateDisplayState();
    }

    private incrementCursor() {
        this.cursorCol++;
        if (this.cursorCol >= 16) {
            this.cursorCol = 0;
            this.cursorRow = (this.cursorRow + 1) % 2;
        }
        this.ddramAddress = this.cursorRow * 0x40 + this.cursorCol;
    }

    private setCursorFromAddress() {
        if (this.ddramAddress < 0x40) {
            this.cursorRow = 0;
            this.cursorCol = this.ddramAddress;
        } else {
            this.cursorRow = 1;
            this.cursorCol = this.ddramAddress - 0x40;
        }
    }

    private updateDisplayState() {
        this.setState({
            displayBuffer: [...this.displayBuffer],
            cursorRow: this.cursorRow,
            cursorCol: this.cursorCol,
            displayOn: this.displayOn,
            cursorOn: this.cursorOn,
            blinkOn: this.blinkOn
        });
    }

    // Helper methods for external access
    writeText(text: string, line: number = 0, col: number = 0) {
        if (line >= 0 && line < 2 && col >= 0 && col < 16) {
            for (let i = 0; i < text.length && col + i < 16; i++) {
                this.displayBuffer[line][col + i] = text[i];
            }
            this.updateDisplayState();
        }
    }

    clear() {
        this.clearDisplay();
    }
}