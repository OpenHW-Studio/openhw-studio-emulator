import { BaseComponent } from '../BaseComponent';

// NTC Thermistor Comparator Module
//
// Real hardware behaviour:
//   - A voltage divider: VCC → fixed resistor (10kΩ) → junction (A0) → NTC → GND
//   - A0 provides analog voltage.
//   - LM393 comparator compares A0 against a threshold set by the potentiometer.
//   - D0 outputs HIGH or LOW based on the comparison.

export class NTCThermistorLogic extends BaseComponent {
    private temperature:        number = 25;
    private nominalResistance:  number = 10000;
    private nominalTemperature: number = 25;
    private betaCoefficient:    number = 3950;
    private threshold:          number = 512; // 0-1023
    private readonly FIXED_R          = 10000;
    
    private powered: boolean = false;
    private transmitting: boolean = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.temperature        = parseFloat(manifest.attrs?.temperature        ?? '25');
        this.nominalResistance  = parseFloat(manifest.attrs?.nominalResistance  ?? '10000');
        this.nominalTemperature = parseFloat(manifest.attrs?.nominalTemperature ?? '25');
        this.betaCoefficient    = parseFloat(manifest.attrs?.betaCoefficient    ?? '3950');
        this.threshold          = parseFloat(manifest.attrs?.threshold          ?? '512');

        this.state = {
            temperature:  this.temperature,
            threshold:    this.threshold,
            powered:      false,
            transmitting: false,
        };
    }

    onEvent(event: any) {
        if (event.type === 'temperature-change' || event.type === 'temperature') {
            this.temperature = Math.max(-40, Math.min(125, parseFloat(event.value)));
            this.syncState();
        }
        if (event.type === 'threshold-change' || event.type === 'threshold') {
            this.threshold = Math.max(0, Math.min(1023, parseFloat(event.value)));
            this.syncState();
        }
        if (event.type === 'POT_CLICK') {
            // Simulate adjusting the potentiometer by decreasing threshold (wraps around)
            this.threshold = (this.threshold + 128) % 1024;
            this.syncState();
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        const vcc = this.getPinVoltage('VCC');
        this.powered = vcc >= 2.0;

        if (this.powered) {
            const rNTC = this.calcResistance(this.temperature);
            // Voltage divider: VCC -> 10k -> A0 -> NTC -> GND
            const vout = vcc * rNTC / (this.FIXED_R + rNTC);
            this.setPinVoltage('A0', vout);
            
            // Comparator output
            // threshold voltage = VCC * (threshold / 1023)
            const vThreshold = vcc * (this.threshold / 1023);
            
            // Active Low: D0 drops to 0V when temperature goes ABOVE threshold (R_NTC drops)
            // Or typically module specific. We'll use active low for high temp.
            if (vout < vThreshold) {
                this.setPinVoltage('D0', 0);
                this.transmitting = true; // D0 LED on (usually lit when LOW trigger)
            } else {
                this.setPinVoltage('D0', vcc);
                this.transmitting = false;
            }
        } else {
            this.setPinVoltage('A0', 0);
            this.setPinVoltage('D0', 0);
            this.transmitting = false;
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

    syncState() {
        this.setState({
            temperature:  this.temperature,
            threshold:    this.threshold,
            powered:      this.powered,
            transmitting: this.transmitting
        });
    }

    // 12.4 v2: numeric UI state for SAB slot {f0: temperature} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {temperature: Number((this as any).temperature ?? 25)},
            i: {},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        {
const pinA = graph.get(`${component.id}.A`);
        const pinB = graph.get(`${component.id}.B`);

        if ((!pinA || pinA.length === 0) && (!pinB || pinB.length === 0)) {
            return `⚠️ [NTC ${component.id}] Not connected. Wire in a voltage divider: 5V → 10kΩ resistor → analog pin → NTC → GND.`;
        }
        if (!pinA || pinA.length === 0) {
            return `⚠️ [NTC ${component.id}] Terminal A is not connected.`;
        }
        if (!pinB || pinB.length === 0) {
            return `⚠️ [NTC ${component.id}] Terminal B is not connected.`;
        }
        return null;
        }

        /* --- next rule --- */
        {
const all = [
            ...(graph.get(`${component.id}.A`) || []),
            ...(graph.get(`${component.id}.B`) || []),
        ];
        const hasAnalog = all.some((c: string) =>
            [':A0',':A1',':A2',':A3',':A4',':A5'].some(p => c.includes(p))
        );
        if (!hasAnalog) {
            return `⚠️ [NTC ${component.id}] Connect one terminal to an analog pin (A0–A5). Use analogRead() and the Beta equation to calculate temperature.`;
        }
        return null;
        }

        /* --- next rule --- */
        {
const all = [
            ...(graph.get(`${component.id}.A`) || []),
            ...(graph.get(`${component.id}.B`) || []),
        ];
        const hasResistor = all.some((c: string) => c.includes('openhw-resistor') || c.includes('openhw-resistor'));
        if (!hasResistor) {
            return `⚠️ [NTC ${component.id}] NTC thermistors need a series resistor (10kΩ) to form a voltage divider. Without it, analogRead() will not give meaningful temperature values.`;
        }
        return null;
        }
}
}
