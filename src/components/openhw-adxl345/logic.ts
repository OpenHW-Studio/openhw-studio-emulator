import { BaseComponent } from '../BaseComponent';

// ADXL345 — 3-axis digital accelerometer
// I2C address: 0x53 (SDO=LOW/float, default) or 0x1D (SDO=HIGH)
//
// Real hardware registers:
//   0x00: DEVID (Device ID) -> returns 0xE5
//   0x2D: POWER_CTL -> bit D3 (0x08) is Measure. Set to 1 to enable measurements.
//   0x32-0x33: DATAX0 / DATAX1 (LSB / MSB)
//   0x34-0x35: DATAY0 / DATAY1 (LSB / MSB)
//   0x36-0x37: DATAZ0 / DATAZ1 (LSB / MSB)
//
// ADXL345 is little-endian (DATAX0 is LSB, DATAX1 is MSB).
// Acceleration scale: default full-resolution mode is 256 LSB/g (±2g to ±16g range)

const ACCEL_SCALE = 256; // 256 LSB per g

export class ADXL345Logic extends BaseComponent {
    private accelX: number = 0;
    private accelY: number = 0;
    private accelZ: number = 1;
    private powered: boolean = false;
    private registerPointer: number = 0;
    private selected: boolean = false;
    private expectingRegister: boolean = true;

    // Persist configuration registers
    private registers: Record<number, number> = {
        0x1E: 0x00, // OFSX
        0x1F: 0x00, // OFSY
        0x20: 0x00, // OFSZ
        0x21: 0x00, // DUR
        0x22: 0x00, // Latent
        0x23: 0x00, // Window
        0x24: 0x00, // THRESH_ACT
        0x25: 0x00, // THRESH_INACT
        0x26: 0x00, // TIME_INACT
        0x27: 0x00, // ACT_INACT_CTL
        0x28: 0x00, // THRESH_FF
        0x29: 0x00, // TIME_FF
        0x2A: 0x00, // TAP_AXES
        0x2B: 0x00, // ACT_TAP_STATUS
        0x2C: 0x0A, // BW_RATE (default 100 Hz, 0x0A)
        0x2D: 0x00, // POWER_CTL (default standby)
        0x2E: 0x00, // INT_ENABLE
        0x2F: 0x00, // INT_MAP
        0x30: 0x02, // INT_SOURCE (default standby/no activity)
        0x31: 0x00, // DATA_FORMAT
    };

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.accelX = parseFloat(manifest.attrs?.accelX ?? '0');
        this.accelY = parseFloat(manifest.attrs?.accelY ?? '0');
        this.accelZ = parseFloat(manifest.attrs?.accelZ ?? '1');

        this.state = {
            powered: false,
            accelX: this.accelX,
            accelY: this.accelY,
            accelZ: this.accelZ,
        };
    }

    private reset() {
        this.registers = {
            0x1E: 0x00, 0x1F: 0x00, 0x20: 0x00, 0x21: 0x00, 0x22: 0x00,
            0x23: 0x00, 0x24: 0x00, 0x25: 0x00, 0x26: 0x00, 0x27: 0x00,
            0x28: 0x00, 0x29: 0x00, 0x2A: 0x00, 0x2B: 0x00, 0x2C: 0x0A,
            0x2D: 0x00, 0x2E: 0x00, 0x2F: 0x00, 0x30: 0x02, 0x31: 0x00,
        };
        this.registerPointer = 0;
    }

    onEvent(event: any) {
        if (event.type === 'accel-change') {
            this.accelX = parseFloat(event.x ?? this.accelX);
            this.accelY = parseFloat(event.y ?? this.accelY);
            this.accelZ = parseFloat(event.z ?? this.accelZ);
            this.setState({ accelX: this.accelX, accelY: this.accelY, accelZ: this.accelZ });
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        const vcc = this.getPinVoltage('VCC');
        // Consider powered if VCC >= 2.0V (covers 3.3V and 5V boards).
        // We also treat it as powered if VCC is 0 but VCC pin is unconnected
        // (getPinVoltage returns 0 for unconnected pins), to handle cases where
        // power is supplied implicitly through the ESP32 3.3V rail without an
        // explicit wire in the canvas.
        const vccConnected = this.pins['VCC'] && this.pins['VCC'].voltage !== undefined;
        this.powered = !vccConnected || vcc >= 2.0;
        if (this.state.powered !== this.powered) {
            this.setState({ powered: this.powered });
        }
    }

    private getI2CAddress(): number {
        // SDO determines the I2C address
        const sdo = this.getPinVoltage('SDO');
        return sdo > 2.0 ? 0x1D : 0x53;
    }

    onI2CStart(address: number, read: boolean): boolean {
        // Note: We do NOT gate on this.powered here.
        // The powered flag is set by the physics update() tick, but onI2CStart
        // fires during the very first begin() call, before any physics tick has
        // run. Gating on powered caused "No ADXL345 detected" even with correct
        // wiring. Instead, we respond to any matching I2C address.
        const addr7 = (address > 0x7F) ? (address >> 1) : address;
        // Accept both 0x53 and 0x1D since SDO might be floating or tied to a pull-up GPIO
        this.selected = (addr7 === 0x53 || addr7 === 0x1D);
        this.expectingRegister = !read;
        return this.selected;
    }

    onI2CByte(address: number, data: number): boolean {
        if (!this.selected) return false;

        if (this.expectingRegister) {
            this.registerPointer = data & 0xFF;
            this.expectingRegister = false;
        } else {
            // Write to register
            const reg = this.registerPointer;
            this.registers[reg] = data & 0xFF;

            // Auto-increment register pointer
            this.registerPointer = (this.registerPointer + 1) & 0xFF;
        }
        return true;
    }

    onI2CStop(): void {
        this.selected = false;
        this.expectingRegister = true;
    }

    readI2CByte(): number {
        const raw = this.getRawRegisters();
        const ptr = this.registerPointer;
        const val = raw[ptr] ?? this.registers[ptr] ?? 0x00;
        this.registerPointer = (this.registerPointer + 1) & 0xFF;
        return val & 0xFF;
    }

    private getRawRegisters(): Record<number, number> {
        const isMeasuring = (this.registers[0x2D] & 0x08) !== 0;

        const toWordLittleEndian = (val: number) => {
            const raw16 = Math.round(val) & 0xFFFF;
            return { low: raw16 & 0xFF, high: (raw16 >> 8) & 0xFF };
        };

        // If not in measuring mode, acceleration values read 0
        const ax = toWordLittleEndian(isMeasuring ? (this.accelX * ACCEL_SCALE) : 0);
        const ay = toWordLittleEndian(isMeasuring ? (this.accelY * ACCEL_SCALE) : 0);
        const az = toWordLittleEndian(isMeasuring ? (this.accelZ * ACCEL_SCALE) : 0);

        const regs: Record<number, number> = {
            0x00: 0xE5,          // DEVID (Device ID) is always 0xE5
            0x32: ax.low,  0x33: ax.high,
            0x34: ay.low,  0x35: ay.high,
            0x36: az.low,  0x37: az.high,
        };

        // Merge with persistent registers
        return { ...this.registers, ...regs };
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            accelX: Number(this.accelX.toFixed(2)),
            accelY: Number(this.accelY.toFixed(2)),
            accelZ: Number(this.accelZ.toFixed(2)),
            powered: this.powered ? "Yes" : "No",
            i2cAddress: "0x" + this.getI2CAddress().toString(16).toUpperCase()
        });
    }
}
