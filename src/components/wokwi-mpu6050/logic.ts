import { BaseComponent } from '../BaseComponent';

// MPU6050 — 6-axis IMU (3-axis accelerometer + 3-axis gyroscope)
// I2C address: 0x68 (AD0=LOW, default) or 0x69 (AD0=HIGH)
//
// Real hardware registers (simplified):
//   0x3B-0x40: ACCEL_XOUT_H/L, ACCEL_YOUT_H/L, ACCEL_ZOUT_H/L
//   0x41-0x42: TEMP_OUT_H/L
//   0x43-0x48: GYRO_XOUT_H/L, GYRO_YOUT_H/L, GYRO_ZOUT_H/L
//   0x6B: PWR_MGMT_1 (write 0x00 to wake up)
//   0x75: WHO_AM_I → returns 0x68
//
// Arduino uses MPU6050 library or Wire directly.
// Acceleration in units of 1g = 16384 LSB (±2g range)
// Gyroscope in units of 1°/s = 131 LSB (±250°/s range)

const MPU6050_ADDRESS = 0x68;
const ACCEL_SCALE = 16384; // LSB per g  (±2g range)
const GYRO_SCALE  = 131;   // LSB per °/s (±250°/s range)
const TEMP_SCALE  = 340;   // LSB per °C

export class MPU6050Logic extends BaseComponent {
    private accelX: number = 0;
    private accelY: number = 0;
    private accelZ: number = 1; // 1g downward at rest
    private gyroX:  number = 0;
    private gyroY:  number = 0;
    private gyroZ:  number = 0;
    private temperature: number = 25;
    private powered: boolean = false;
    private registerPointer: number = 0;
    private sleeping: boolean = true; // wakes up on PWR_MGMT_1 write

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
            powered:     false,
            accelX: this.accelX, accelY: this.accelY, accelZ: this.accelZ,
            gyroX:  this.gyroX,  gyroY:  this.gyroY,  gyroZ:  this.gyroZ,
            temperature: this.temperature,
        };
    }

    onEvent(event: any) {
        if (event.type === 'accel-change') {
            this.accelX = parseFloat(event.x ?? this.accelX);
            this.accelY = parseFloat(event.y ?? this.accelY);
            this.accelZ = parseFloat(event.z ?? this.accelZ);
            this.setState({ accelX: this.accelX, accelY: this.accelY, accelZ: this.accelZ });
        }
        if (event.type === 'gyro-change') {
            this.gyroX = parseFloat(event.x ?? this.gyroX);
            this.gyroY = parseFloat(event.y ?? this.gyroY);
            this.gyroZ = parseFloat(event.z ?? this.gyroZ);
            this.setState({ gyroX: this.gyroX, gyroY: this.gyroY, gyroZ: this.gyroZ });
        }
        if (event.type === 'temp-change') {
            this.temperature = parseFloat(event.value);
            this.setState({ temperature: this.temperature });
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        const vcc = this.getPinVoltage('VCC');
        this.powered = vcc >= 2.375;
        this.setState({ powered: this.powered });
    }

    // I2C interface
    onI2CStart(address: number, read: boolean): boolean {
        return address === MPU6050_ADDRESS && this.powered;
    }

    onI2CByte(address: number, data: number): boolean {
        if (address !== MPU6050_ADDRESS) return false;
        if (data === 0x6B) {
            // Next byte is PWR_MGMT_1 value — wake up the chip
            this.sleeping = false;
        }
        this.registerPointer = data;
        return true;
    }

    onI2CStop(): void {}

    readI2CByte(): number {
        if (this.sleeping) return 0xFF;

        // Convert physical values to raw 16-bit register values
        const raw = this.getRawRegisters();
        const ptr = this.registerPointer;
        const val = raw[ptr] ?? 0x00;
        this.registerPointer = (this.registerPointer + 1) & 0xFF;
        return val & 0xFF;
    }

    private getRawRegisters(): Record<number, number> {
        const toWord = (val: number) => {
            const raw16 = Math.round(val) & 0xFFFF;
            return { high: (raw16 >> 8) & 0xFF, low: raw16 & 0xFF };
        };

        const ax = toWord(this.accelX * ACCEL_SCALE);
        const ay = toWord(this.accelY * ACCEL_SCALE);
        const az = toWord(this.accelZ * ACCEL_SCALE);
        const temp = toWord((this.temperature * TEMP_SCALE) + 12421);
        const gx = toWord(this.gyroX * GYRO_SCALE);
        const gy = toWord(this.gyroY * GYRO_SCALE);
        const gz = toWord(this.gyroZ * GYRO_SCALE);

        return {
            0x3B: ax.high,  0x3C: ax.low,
            0x3D: ay.high,  0x3E: ay.low,
            0x3F: az.high,  0x40: az.low,
            0x41: temp.high, 0x42: temp.low,
            0x43: gx.high,  0x44: gx.low,
            0x45: gy.high,  0x46: gy.low,
            0x47: gz.high,  0x48: gz.low,
            0x6B: this.sleeping ? 0x40 : 0x00, // PWR_MGMT_1
            0x75: 0x68,                          // WHO_AM_I
        };
    }
}
