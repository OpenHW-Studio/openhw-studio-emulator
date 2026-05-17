import { BaseComponent } from '../BaseComponent';

export class BuzzerLogic extends BaseComponent {
    private lastVoltage: boolean = false;
    private lastEdgeTime: number = 0;
    private periods: number[] = [];
    private lastUpdateTime: number = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { isBuzzing: false, frequency: 0 };
    }

    update(time: number, wires: any[], instances: BaseComponent[]) {
        super.update(time, wires, instances);
        const v1 = this.getPinVoltage('1');
        const v2 = this.getPinVoltage('2');

        const vDiff = v1 - v2;
        const currentVoltage = vDiff > 2.0;

        // Detect rising edge
        if (currentVoltage && !this.lastVoltage) {
            const period = time - this.lastEdgeTime;
            this.lastEdgeTime = time;
            
            // Allow frequencies between 20Hz (50,000,000ns) and 20kHz (50,000ns)
            if (period >= 50000 && period <= 50000000) {
                this.periods.push(period);
                if (this.periods.length > 5) this.periods.shift();
            }
        }
        this.lastVoltage = currentVoltage;

        // Update state periodically (e.g., every 50ms = 50,000,000ns)
        if (time - this.lastUpdateTime > 50000000) {
            this.lastUpdateTime = time;
            
            // Check if we haven't had an edge recently (timeout based on lowest frequency 20Hz = 50ms)
            // Let's use 100ms timeout for safety (100,000,000ns)
            if (time - this.lastEdgeTime > 100000000) {
                this.periods = [];
                if (this.state.isBuzzing) {
                    this.setState({ isBuzzing: false, frequency: 0, current: 0, voltageDrop: 0 });
                }
            } else if (this.periods.length >= 2) {
                // Average the recent periods to find frequency
                const avgPeriod = this.periods.reduce((a, b) => a + b, 0) / this.periods.length;
                const freq = 1_000_000_000 / avgPeriod;
                
                // Only update state if frequency changed significantly (>1%) or buzzing state changed
                if (!this.state.isBuzzing || Math.abs(this.state.frequency - freq) / freq > 0.01) {
                    this.setState({
                        isBuzzing: true,
                        frequency: freq,
                        voltageDrop: 3.3, // Approximate drop
                        current: 0.015
                    });
                }
            }
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            status: this.state.isBuzzing ? 'Buzzing' : 'Silent',
            frequency: this.state.isBuzzing ? Math.round(this.state.frequency) + ' Hz' : '0 Hz',
            voltageDrop: (this.state.voltageDrop || 0).toFixed(2) + ' V',
            current: ((this.state.current || 0) * 1000).toFixed(2) + ' mA'
        });
    }
}
