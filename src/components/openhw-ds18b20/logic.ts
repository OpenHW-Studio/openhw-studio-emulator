import { BaseComponent } from '../BaseComponent';

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
//   Since 1-Wire is a complex bit-bang protocol, we simulate at the
//   abstraction level — we expose the temperature as a state value
//   that the engine injects into the DallasTemperature library response.
//   The DQ pin voltage is modelled for basic HIGH/LOW detection.

export class DS18B20Logic extends BaseComponent {
    private temperature: number = 25.0; // degrees Celsius

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.temperature = parseFloat(manifest.attrs?.temperature ?? '25');
        this.state = {
            temperature: this.temperature,
            rawValue: this._toRaw(this.temperature),
            connected: false,
        };
    }

    // Called when the user changes temperature via slider in the UI
    onEvent(event: any) {
        if (event.type === 'temperature-change') {
            this.temperature = Math.max(-55, Math.min(125, parseFloat(event.value)));
            this.setState({
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

    // DS18B20 stores temperature as a 16-bit value in units of 1/16°C
    // e.g. 25°C = 25 * 16 = 400 = 0x0190
    private _toRaw(tempC: number): number {
        return Math.round(tempC * 16);
    }
}
