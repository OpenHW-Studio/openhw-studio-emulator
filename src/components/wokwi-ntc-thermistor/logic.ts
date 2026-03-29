import { BaseComponent } from '../BaseComponent';

// NTC Thermistor — Analog temperature sensor (2-pin resistor)
//
// Real hardware behaviour:
//   - A passive resistor whose resistance DECREASES as temperature INCREASES
//   - Used in a voltage divider: VCC → fixed resistor (10kΩ) → junction → NTC → GND
//   - Junction connected to analog pin — analogRead() gives 0–1023
//   - Arduino sketch to get temperature:
//       int raw = analogRead(A0);
//       float resistance = 10000.0 * raw / (1023.0 - raw);
//       float tempK = 1.0 / (log(resistance / 10000.0) / 3950.0 + 1.0 / 298.15);
//       float tempC = tempK - 273.15;
//
// Beta equation: R = R0 * exp( B * (1/T - 1/T0) )

export class NTCThermistorLogic extends BaseComponent {
    private temperature:        number = 25;
    private nominalResistance:  number = 10000;
    private nominalTemperature: number = 25;
    private betaCoefficient:    number = 3950;
    private readonly FIXED_R          = 10000;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.temperature        = parseFloat(manifest.attrs?.temperature        ?? '25');
        this.nominalResistance  = parseFloat(manifest.attrs?.nominalResistance  ?? '10000');
        this.nominalTemperature = parseFloat(manifest.attrs?.nominalTemperature ?? '25');
        this.betaCoefficient    = parseFloat(manifest.attrs?.betaCoefficient    ?? '3950');

        this.state = {
            temperature:  this.temperature,
            resistance:   this.calcResistance(this.temperature),
            analogValue:  this.calcAnalogValue(this.temperature),
            voltage:      this.calcVoltage(this.temperature),
        };
    }

    onEvent(event: any) {
        if (event.type === 'temperature-change') {
            this.temperature = Math.max(-40, Math.min(125, parseFloat(event.value)));
            this.syncState();
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        const vA  = this.getPinVoltage('A');
        const vB  = this.getPinVoltage('B');
        const vin = Math.max(vA, vB);

        if (vin > 0) {
            const rNTC = this.calcResistance(this.temperature);
            const vout = vin * rNTC / (this.FIXED_R + rNTC);
            this.setPinVoltage('A', vout);
        }

        this.syncState();
    }

    calcResistance(tempC: number): number {
        const T  = tempC + 273.15;
        const T0 = this.nominalTemperature + 273.15;
        return Math.round(
            this.nominalResistance * Math.exp(this.betaCoefficient * (1 / T - 1 / T0))
        );
    }

    calcVoltage(tempC: number): number {
        const r = this.calcResistance(tempC);
        return parseFloat((5.0 * r / (this.FIXED_R + r)).toFixed(3));
    }

    calcAnalogValue(tempC: number): number {
        return Math.round((this.calcVoltage(tempC) / 5.0) * 1023);
    }

    syncState() {
        this.setState({
            temperature:  this.temperature,
            resistance:   this.calcResistance(this.temperature),
            analogValue:  this.calcAnalogValue(this.temperature),
            voltage:      this.calcVoltage(this.temperature),
        });
    }
}
