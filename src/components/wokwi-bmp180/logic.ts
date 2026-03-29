import { BaseComponent } from '../BaseComponent';

// BMP180 — I2C Barometric Pressure + Temperature Sensor
//
// Real hardware behaviour:
//   - Communicates over I2C bus (address 0x77)
//   - Arduino uses the Adafruit_BMP085 or BMP180 library
//   - Returns temperature (°C) and pressure (Pa)
//   - Can calculate altitude from pressure using:
//       altitude = 44330 * (1 - pow(pressure / 101325.0, 1/5.255))
//
// Typical Arduino sketch:
//   #include <Adafruit_BMP085.h>
//   Adafruit_BMP085 bmp;
//   bmp.begin();
//   float temp = bmp.readTemperature();
//   long  pres = bmp.readPressure();
//   float alt  = bmp.readAltitude();
//
// I2C Address: 0x77 (fixed)
// Simulation approach:
//   We handle I2C register reads via onI2CStart / onI2CByte hooks.
//   The engine routes I2C transactions to the matching component by address.

const BMP180_ADDRESS = 0x77;

// BMP180 register map (read-only registers we simulate)
const REG_CHIP_ID        = 0xD0; // returns 0x55
const REG_TEMP_MSB       = 0xF6;
const REG_TEMP_LSB       = 0xF7;
const REG_PRESSURE_MSB   = 0xF6;
const REG_PRESSURE_LSB   = 0xF7;
const REG_PRESSURE_XLSB  = 0xF8;
const REG_CTRL_MEAS      = 0xF4;
const CMD_TEMP           = 0x2E;
const CMD_PRESSURE_OSS0  = 0x34;

export class BMP180Logic extends BaseComponent {
    private temperature: number = 25.0;   // °C
    private pressure:    number = 101325; // Pa (sea level standard)
    private registerPointer: number = 0;
    private lastCommand:     number = CMD_TEMP;
    private powered:         boolean = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.temperature = parseFloat(manifest.attrs?.temperature ?? '25');
        this.pressure    = parseFloat(manifest.attrs?.pressure    ?? '101325');

        this.state = {
            temperature: this.temperature,
            pressure:    this.pressure,
            altitude:    this.calcAltitude(this.pressure),
            powered:     false,
        };
    }

    onEvent(event: any) {
        if (event.type === 'temperature-change') {
            this.temperature = Math.max(-40, Math.min(85, parseFloat(event.value)));
            this.syncState();
        }
        if (event.type === 'pressure-change') {
            // Clamp to realistic range: ~30000 Pa (Everest) to ~110000 Pa
            this.pressure = Math.max(30000, Math.min(110000, parseFloat(event.value)));
            this.syncState();
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        const vcc = this.getPinVoltage('VCC');
        this.powered = vcc >= 1.8;
        this.setState({ powered: this.powered });
    }

    // ── I2C interface ────────────────────────────────────────────────────────

    onI2CStart(address: number, read: boolean): boolean {
        // Only respond to our address
        if (address !== BMP180_ADDRESS) return false;
        return this.powered;
    }

    onI2CByte(address: number, data: number): boolean {
        if (address !== BMP180_ADDRESS) return false;

        // If this is a write, it sets the register pointer or a command
        if (data === REG_CTRL_MEAS) {
            // next byte will be the command
            this.registerPointer = REG_CTRL_MEAS;
        } else if (this.registerPointer === REG_CTRL_MEAS) {
            this.lastCommand = data;
            this.registerPointer = REG_TEMP_MSB;
        } else {
            this.registerPointer = data;
        }
        return true;
    }

    onI2CStop(): void {
        // nothing to do on stop
    }

    // Called by engine when master reads a byte from us
    readI2CByte(): number {
        switch (this.registerPointer) {
            case REG_CHIP_ID:
                this.registerPointer++;
                return 0x55; // BMP180 chip ID

            case REG_TEMP_MSB: {
                // UT = (temperature / 0.1) + calibration_offset
                // Simplified: UT = temp * 10 + 2000 (matches Adafruit library)
                const ut = Math.round(this.temperature * 10 + 2000);
                this.registerPointer = REG_TEMP_LSB;
                return (ut >> 8) & 0xFF;
            }
            case REG_TEMP_LSB: {
                const ut = Math.round(this.temperature * 10 + 2000);
                this.registerPointer++;
                return ut & 0xFF;
            }
            case REG_PRESSURE_MSB: {
                // UP = pressure (raw uncompensated, oss=0)
                // Simplified linear mapping so library gets correct value
                const up = Math.round((this.pressure - 50000) * 2);
                this.registerPointer = REG_PRESSURE_LSB;
                return (up >> 16) & 0xFF;
            }
            case REG_PRESSURE_LSB: {
                const up = Math.round((this.pressure - 50000) * 2);
                this.registerPointer = REG_PRESSURE_XLSB;
                return (up >> 8) & 0xFF;
            }
            case REG_PRESSURE_XLSB: {
                const up = Math.round((this.pressure - 50000) * 2);
                this.registerPointer++;
                return up & 0xFF;
            }
            default:
                return 0xFF;
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    calcAltitude(pressurePa: number): number {
        // Standard barometric formula
        return parseFloat(
            (44330 * (1 - Math.pow(pressurePa / 101325.0, 1 / 5.255))).toFixed(1)
        );
    }

    syncState() {
        this.setState({
            temperature: this.temperature,
            pressure:    this.pressure,
            altitude:    this.calcAltitude(this.pressure),
            powered:     this.powered,
        });
    }
}
