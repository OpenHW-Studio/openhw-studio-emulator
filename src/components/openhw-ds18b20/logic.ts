import { BaseComponent } from '../BaseComponent';
import { OneWireProtocol } from '../../protocol-handlers/index';

// DS18B20 — Digital 1-Wire Temperature Sensor
//
// Real hardware behaviour:
//   - Communicates over a single wire (1-Wire protocol) using the DQ pin
//   - The Arduino uses the DallasTemperature + OneWire library to read it
//   - Returns a 16-bit signed integer representing temp in units of 0.0625°C
//   - Valid range: -55°C to +125°C
//   - Typical Arduino sketch:
//       #include <OneWire.h>
//       #include <DallasTemperature.h>
//       OneWire ow(2);
//       DallasTemperature sensors(&ow);
//       sensors.requestTemperatures();
//       float t = sensors.getTempCByIndex(0);
//
// Simulation approach:
//   The OneWireProtocol base class tracks the OW state machine (RESET → ROM_CMD →
//   FUNCTION_CMD → DATA). DS18B20 hooks in via:
//     - onConvertTemperature()  — called when master sends 0x44 (start conversion)
//     - onReadScratchpad()      — called when master sends 0xBE (read scratchpad)
//   The DQ pin is driven HIGH when powered (idle pull-up state).

export class DS18B20Logic extends OneWireProtocol {
    private temperature: number = 25.0; // degrees Celsius

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.temperature = parseFloat(manifest.attrs?.temperature ?? '25');
        this.state = {
            ...this.state,
            temperature: this.temperature,
            rawValue: this._toRaw(this.temperature),
            connected: false,
        };
        // Pre-load the scratchpad with the initial temperature
        this.setScratchpad(this._buildScratchpad(this.temperature));
    }

    // OneWireProtocol hook: called when master sends 0x44 (Convert T command)
    onConvertTemperature(): void {
        // Temperature is always up-to-date from onEvent / update()
        // Just rebuild the scratchpad with the latest value
        this.setScratchpad(this._buildScratchpad(this.temperature));
    }

    // OneWireProtocol hook: called when master sends 0xBE (Read Scratchpad)
    onReadScratchpad(): number[] {
        return this._buildScratchpad(this.temperature);
    }

    // Override ROM address — DS18B20 family code is 0x28
    getROMAddress(): number[] {
        return [0x28, 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF, 0x00];
    }

    // Called when the user changes temperature via slider in the UI
    onEvent(event: any) {
        if (event.type === 'temperature-change') {
            this.temperature = Math.max(-55, Math.min(125, parseFloat(event.value)));
            this.setScratchpad(this._buildScratchpad(this.temperature));
            this.setState({
                ...this.state,
                temperature: this.temperature,
                rawValue: this._toRaw(this.temperature),
            });
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        const vdd = this.getPinVoltage('VCC') || this.getPinVoltage('VDD');
        const isPowered = vdd > 2.5;

        // DQ pin is pulled HIGH when idle (1-Wire requires pull-up resistor)
        if (isPowered) {
            this.setPinVoltage('DQ', 5.0);
        }

        this.setState({
            ...this.state,
            temperature: this.temperature,
            rawValue: this._toRaw(this.temperature),
            connected: isPowered,
        });
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            temperature: Number(this.temperature.toFixed(2)),
            rawValue: this._toRaw(this.temperature),
            connected: Boolean(this.state.connected),
        });
    }

    // DS18B20 stores temperature as a 16-bit signed value in units of 1/16°C
    // e.g. 25°C = 25 * 16 = 400 = 0x0190
    private _toRaw(tempC: number): number {
        return Math.round(tempC * 16);
    }

    // Build the full 9-byte DS18B20 scratchpad register
    // Bytes: [Temp LSB, Temp MSB, TH alarm, TL alarm, Config, 0xFF, 0x0C, 0x10, CRC]
    private _buildScratchpad(tempC: number): number[] {
        const raw = this._toRaw(tempC);
        const lsb = raw & 0xFF;
        const msb = (raw >> 8) & 0xFF;
        const config = 0x7F; // 12-bit resolution
        const scratchpad = [lsb, msb, 0x4B, 0x46, config, 0xFF, 0x0C, 0x10, 0x00];
        // Compute CRC-8 (Dallas/Maxim) over first 8 bytes
        scratchpad[8] = this._crc8(scratchpad.slice(0, 8));
        return scratchpad;
    }

    // CRC-8 polynomial: x^8 + x^5 + x^4 + 1 (Dallas/Maxim)
    private _crc8(data: number[]): number {
        let crc = 0;
        for (const byte of data) {
            let b = byte;
            for (let i = 0; i < 8; i++) {
                const mix = (crc ^ b) & 0x01;
                crc >>= 1;
                if (mix) crc ^= 0x8C;
                b >>= 1;
            }
        }
        return crc;
    }
}
