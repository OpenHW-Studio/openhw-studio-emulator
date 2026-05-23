import { BaseComponent } from '../BaseComponent';
import { I2CProtocol } from '../../protocol-handlers/index';

// BMP180 — I2C Barometric Pressure + Temperature Sensor
// I2C Address: 0x77 (fixed, no AD0 pin)
//
// Arduino uses Adafruit_BMP085 or Adafruit_BMP180 library:
//   bmp.begin();
//   float temp = bmp.readTemperature();
//   long  pres = bmp.readPressure();
//   float alt  = bmp.readAltitude();
//
// Key registers:
//   0xAA-0xBF: Factory calibration coefficients (we use magic numbers for simple math)
//   0xD0: Chip ID → 0x55
//   0xF4: CTRL_MEAS (write CMD_TEMP=0x2E or CMD_PRES=0x34/0x74/0xB4/0xF4)
//   0xF6-0xF8: Result MSB/LSB/XLSB

const REG_CHIP_ID   = 0xD0;
const REG_CTRL_MEAS = 0xF4;
const REG_RESULT    = 0xF6;
const CMD_TEMP      = 0x2E;

export class BMP180Logic extends I2CProtocol {
    private temperature = 25.0;   // °C
    private pressure    = 101325; // Pa
    private powered     = false;
    private lastCmd     = CMD_TEMP;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.temperature = parseFloat(manifest.attrs?.temperature ?? '25');
        this.pressure    = parseFloat(manifest.attrs?.pressure    ?? '101325');
        this.state = {
            ...this.state,
            temperature: this.temperature,
            pressure:    this.pressure,
            altitude:    this._altitude(this.pressure),
            powered:     false,
        };
    }

    // ── I2CProtocol hooks ────────────────────────────────────────────────────

    onI2CWriteRegister(reg: number, data: number[]): void {
        if (reg === REG_CTRL_MEAS && data.length > 0) {
            this.lastCmd = data[0];
        }
        // Other writes are ignored in simulation
    }

    onI2CReadRequest(reg: number, count: number): number[] {
        const result: number[] = [];
        for (let i = 0; i < count; i++) {
            result.push(this._readReg(reg + i));
        }
        return result;
    }

    // ── Register logic ────────────────────────────────────────────────────────

    private _readReg(reg: number): number {
        if (reg === REG_CHIP_ID) return 0x55;

        // Calibration registers 0xAA-0xBF
        // Magic numbers that make Adafruit_BMP085 library produce linear output:
        //   ac4=32768, ac5=32768, ac6=32768, md=1, all others=0
        if (reg >= 0xAA && reg <= 0xBF) {
            switch (reg) {
                case 0xB0: return 0x80; // ac4 MSB
                case 0xB2: return 0x80; // ac5 MSB
                case 0xB4: return 0x80; // ac6 MSB
                case 0xBF: return 0x01; // md LSB
                default:   return 0x00;
            }
        }

        if (reg === REG_RESULT) {
            const isTemp = this.lastCmd === CMD_TEMP;
            const val = isTemp ? this._ut() : this._up();
            return (val >> 16) & 0xFF; // MSB
        }
        if (reg === REG_RESULT + 1) {
            const isTemp = this.lastCmd === CMD_TEMP;
            const val = isTemp ? this._ut() : this._up();
            return (val >> 8) & 0xFF; // LSB
        }
        if (reg === REG_RESULT + 2) {
            return this._up() & 0xFF; // XLSB (pressure only)
        }

        return 0xFF;
    }

    // Temperature uncompensated value (UT) → matches Adafruit library formula
    private _ut(): number {
        return Math.max(0, Math.min(65535, Math.round(this.temperature * 160 + 32760)));
    }

    // Pressure uncompensated value (UP) → reverse-engineered from Adafruit formula
    private _up(): number {
        const oss = this.lastCmd >= 0x34 ? (this.lastCmd - 0x34) >> 6 : 0;
        let p = this.pressure;
        // 3 iterations of Newton's method to invert the compensation formula
        for (let i = 0; i < 3; i++) {
            const x1 = ((p >> 8) * (p >> 8) * 3038) >> 16;
            const x2 = (-7357 * p) >> 16;
            p = this.pressure - ((x1 + x2 + 3791) >> 4);
        }
        return Math.max(0, Math.round(p * 16384 / (50000 >> oss)));
    }

    private _altitude(pa: number): number {
        return parseFloat((44330 * (1 - Math.pow(pa / 101325.0, 1 / 5.255))).toFixed(1));
    }

    // ── Standard lifecycle ────────────────────────────────────────────────────

    onEvent(event: any) {
        if (event.type === 'temperature-change') {
            this.temperature = Math.max(-40, Math.min(85, parseFloat(event.value)));
        }
        if (event.type === 'pressure-change') {
            this.pressure = Math.max(30000, Math.min(110000, parseFloat(event.value)));
        }
        this.setState({
            temperature: this.temperature,
            pressure:    this.pressure,
            altitude:    this._altitude(this.pressure),
        });
    }

    update(cpuCycles: number, wires: any[], instances: BaseComponent[]) {
        const vcc = this.getPinVoltage('VIN');
        const wasPowered = this.powered;
        this.powered = vcc >= 1.8;
        if (this.powered !== wasPowered) this.setState({ powered: this.powered });
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            temperature: `${this.temperature.toFixed(1)}°C`,
            pressure:    `${this.pressure.toFixed(0)} Pa`,
            altitude:    `${this._altitude(this.pressure).toFixed(1)} m`,
        });
    }
}
