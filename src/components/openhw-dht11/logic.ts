import { BaseComponent } from '../BaseComponent';

export class DHT11Logic extends BaseComponent {
    private temperature: number = 25;
    private humidity: number = 50;
    
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.temperature = parseFloat(manifest.attrs?.temperature ?? '25');
        this.humidity = parseFloat(manifest.attrs?.humidity ?? '50');

        this.state = {
            temperature: this.temperature,
            humidity: this.humidity
        };
    }

    onEvent(event: any) {
        if (event.type === 'temperature') {
            this.temperature = parseFloat(event.value);
            this.syncState();
        }
        if (event.type === 'humidity') {
            this.humidity = parseFloat(event.value);
            this.syncState();
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        // Advanced bit-banged 1-wire protocol is complex to simulate purely in JS without native hooks.
        // We leave the pin floating or HIGH to prevent locking the bus.
        const vcc = this.getPinVoltage('VCC');
        if (vcc > 2.0) {
            // Usually DATA is pulled up by an external resistor, 
            // the sensor will pull it low to respond.
            // We just mock it as idle here.
        }
    }

    syncState() {
        this.setState({
            temperature: this.temperature,
            humidity: this.humidity
        });
    }
}
