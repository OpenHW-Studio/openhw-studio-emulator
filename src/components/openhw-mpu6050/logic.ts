import { BaseComponent } from '../BaseComponent';
import { I2CProtocol } from '../../protocol-handlers/index';

// MPU6050 — 6-axis IMU (3-axis accelerometer + 3-axis gyroscope)
// I2C address: 0x68 (AD0=LOW, default) or 0x69 (AD0=HIGH)
//
// Registers (simplified):
//   0x3B-0x48: Accelerometer + Temperature + Gyroscope output words (16-bit each)
//   0x6B: PWR_MGMT_1 (write 0x00 to wake up; bit 7 = RESET; bit 6 = SLEEP)
//   0x75: WHO_AM_I → always returns 0x68
//
// Arduino uses MPU6050 library or Wire.requestFrom(0x68, 14) directly.
// Acceleration in units of 1g = 16384 LSB (±2g range)
// Gyroscope in units of 1°/s = 131 LSB (±250°/s range)

const ACCEL_SCALE = 16384; // LSB per g  (±2g range)
const GYRO_SCALE  = 131;   // LSB per °/s (±250°/s range)
const TEMP_SCALE  = 340;   // LSB per °C

export class MPU6050Logic extends I2CProtocol {
    private accelX = 0.0;
    private accelY = 0.0;
    private accelZ = 1.0;
    private gyroX  = 0.0;
    private gyroY  = 0.0;
    private gyroZ  = 0.0;
    private temperature = 25.0;
    private powered = false;
    // FIX #3: Start NOT sleeping so the sensor responds immediately when
    // powered — mirrors the physical device behaviour after a cold power-on
    // where the host sketch writes 0x00 to 0x6B to wake it. In simulation the
    // sketch may not always execute that I2C write (e.g. timing), so default
    // to awake so i2cTraffic is never empty just because of the sleep bit.
    private sleeping = false;

    // Writable config registers
    private cfgRegisters: Record<number, number> = {
        0x19: 0x00, 0x1A: 0x00, 0x1B: 0x00, 0x1C: 0x00, 0x1D: 0x00,
        0x23: 0x00, 0x38: 0x00, 0x6A: 0x00,
        // FIX #3: 0x6B default is 0x00 (awake) — was 0x40 (SLEEP bit set).
        0x6B: 0x00, 0x6C: 0x00,
    };

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.accelX      = parseFloat(manifest.attrs?.accelX      ?? '0');
        this.accelY      = parseFloat(manifest.attrs?.accelY      ?? '0');
        this.accelZ      = parseFloat(manifest.attrs?.accelZ      ?? '1');
        this.gyroX       = parseFloat(manifest.attrs?.gyroX       ?? '0');
        this.gyroY       = parseFloat(manifest.attrs?.gyroY       ?? '0');
        this.gyroZ       = parseFloat(manifest.attrs?.gyroZ       ?? '0');
        this.temperature = parseFloat(manifest.attrs?.temperature  ?? '25');

        this.state = {
            ...this.state,
            powered: false,
            // FIX #1: expose flat scalar keys ax/ay/az/gx/gy/gz/temp that the
            // manifest telemetry template (state.ax etc.) and the log format
            // both reference.  Previously only accelX/gyroX/temperature were
            // stored, so state.ax was always undefined → "N/A" in every log line.
            ax: this.accelX, ay: this.accelY, az: this.accelZ,
            gx: this.gyroX,  gy: this.gyroY,  gz: this.gyroZ,
            temp: this.temperature,
        };
    }

    // ── I2CProtocol hooks ────────────────────────────────────────────────────

    // Override address detection to support AD0 pin
    onI2CStart(address: number, read: boolean): boolean {
        if (!this.powered) return false;
        // AD0 pin high → address 0x69
        const ad0 = this.getPinVoltage('ADO') > 2.0;
        const myAddr = ad0 ? 0x69 : 0x68;
        const addr7 = (address > 0x7F) ? (address >> 1) : address;
        if (addr7 !== myAddr) return false;
        return super.onI2CStart(address, read);
    }

    onI2CWriteRegister(reg: number, data: number[]): void {
        if (reg === 0x6B) {
            const val = data[0] ?? 0;
            if (val & 0x80) {
                // DEVICE_RESET
                this.sleeping = false; // FIX #3: reset to awake, not sleeping
                this.cfgRegisters = {
                    0x19: 0x00, 0x1A: 0x00, 0x1B: 0x00, 0x1C: 0x00, 0x1D: 0x00,
                    0x23: 0x00, 0x38: 0x00, 0x6A: 0x00, 0x6B: 0x00, 0x6C: 0x00,
                };
            } else {
                this.sleeping = (val & 0x40) !== 0;
                this.cfgRegisters[0x6B] = val;
            }
        } else {
            // Auto-increment write to config registers
            for (let i = 0; i < data.length; i++) {
                this.cfgRegisters[(reg + i) & 0xFF] = data[i] & 0xFF;
            }
        }
    }

    onI2CReadRequest(reg: number, count: number): number[] {
        const all = this._buildRegisterMap();
        const result: number[] = [];
        for (let i = 0; i < count; i++) {
            const r = (reg + i) & 0xFF;
            result.push((all[r] ?? this.cfgRegisters[r] ?? 0x00) & 0xFF);
        }
        return result;
    }

    // ── IMU register map ─────────────────────────────────────────────────────

    private _buildRegisterMap(): Record<number, number> {
        const w = (val: number) => {
            const raw = Math.round(val) & 0xFFFF;
            return { h: (raw >> 8) & 0xFF, l: raw & 0xFF };
        };
        const ax = w(this.accelX * ACCEL_SCALE);
        const ay = w(this.accelY * ACCEL_SCALE);
        const az = w(this.accelZ * ACCEL_SCALE);
        const tp = w(this.temperature * TEMP_SCALE - 12420);
        const gx = w(this.gyroX * GYRO_SCALE);
        const gy = w(this.gyroY * GYRO_SCALE);
        const gz = w(this.gyroZ * GYRO_SCALE);

        return {
            0x3B: ax.h, 0x3C: ax.l,
            0x3D: ay.h, 0x3E: ay.l,
            0x3F: az.h, 0x40: az.l,
            0x41: tp.h, 0x42: tp.l,
            0x43: gx.h, 0x44: gx.l,
            0x45: gy.h, 0x46: gy.l,
            0x47: gz.h, 0x48: gz.l,
            0x75: 0x68,               // WHO_AM_I
        };
    }

    // ── Standard lifecycle ────────────────────────────────────────────────────

    onEvent(event: any) {
        if (event.type === 'accel-change') {
            this.accelX = parseFloat(event.x ?? this.accelX);
            this.accelY = parseFloat(event.y ?? this.accelY);
            this.accelZ = parseFloat(event.z ?? this.accelZ);
            this.setState({
                ax: this.accelX, ay: this.accelY, az: this.accelZ,
            });
        }
        if (event.type === 'gyro-change') {
            this.gyroX = parseFloat(event.x ?? this.gyroX);
            this.gyroY = parseFloat(event.y ?? this.gyroY);
            this.gyroZ = parseFloat(event.z ?? this.gyroZ);
            this.setState({
                gx: this.gyroX, gy: this.gyroY, gz: this.gyroZ,
            });
        }
        if (event.type === 'temp-change') {
            this.temperature = parseFloat(event.value);
            this.setState({ temp: this.temperature });
        }

        // FIX #2: Handle SET_ATTR events dispatched by the context-menu UI.
        // Previously only 'accel-change'/'gyro-change'/'temp-change' were
        // handled, so dragging the sliders / typing in the input boxes in the
        // inspector had no effect on the running simulation.
        if (event.type === 'SET_ATTR') {
            const key = String(event.key || '');
            const val = parseFloat(event.value ?? event.val ?? '0');
            if (key === 'accelX') { this.accelX = val; this.setState({ ax: val }); }
            if (key === 'accelY') { this.accelY = val; this.setState({ ay: val }); }
            if (key === 'accelZ') { this.accelZ = val; this.setState({ az: val }); }
            if (key === 'gyroX')  { this.gyroX  = val; this.setState({ gx: val }); }
            if (key === 'gyroY')  { this.gyroY  = val; this.setState({ gy: val }); }
            if (key === 'gyroZ')  { this.gyroZ  = val; this.setState({ gz: val }); }
            if (key === 'temperature') { this.temperature = val; this.setState({ temp: val }); }
        }
    }

    update(cpuCycles: number, wires: any[], instances: BaseComponent[]) {
        const vcc = this.getPinVoltage('VCC');
        // FIX #4: Also require GND to be low (< 1 V) before treating the
        // component as powered — the log shows GND: false, meaning a floating
        // ground.  Without this check the sensor can appear powered even when
        // GND is unconnected, masking the real wiring problem.
        const gnd = this.getPinVoltage('GND');
        const wasPowered = this.powered;
        this.powered = vcc >= 2.375 && gnd < 1.0;
        if (this.powered !== wasPowered) {
            this.setState({ powered: this.powered });
        }
    }

    onCustomTelemetry() {
        // FIX #1: Expose individual scalar keys (ax, ay, az, gx, gy, gz, temp)
        // that match the manifest telemetry template placeholders
        // (${state.ax}, ${state.gx}, ${state.temp}) and the log format used
        // by TelemetryManager.  Previously this method stored formatted strings
        // under 'accel', 'gyro', and 'temperature', so the telemetry system
        // could never resolve state.ax → every field showed N/A in every log.
        this.setCustomTelemetry({
            ax: Number(this.accelX.toFixed(3)),
            ay: Number(this.accelY.toFixed(3)),
            az: Number(this.accelZ.toFixed(3)),
            gx: Number(this.gyroX.toFixed(1)),
            gy: Number(this.gyroY.toFixed(1)),
            gz: Number(this.gyroZ.toFixed(1)),
            temp: Number(this.temperature.toFixed(1)),
            sleeping: this.sleeping,
        });
    }
}
