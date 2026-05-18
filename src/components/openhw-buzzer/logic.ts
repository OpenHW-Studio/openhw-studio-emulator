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

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        super.onPinStateChange(pinId, isHigh, cpuCycles);

        const currentV1 = this.getPinVoltage('1');
        const currentV2 = this.getPinVoltage('2');
        const vDiff = Math.abs(currentV1 - currentV2);
        const currentVoltage = vDiff > 2.0;

        if (currentVoltage !== this.lastVoltage) {
            this.lastVoltage = currentVoltage;
            if (currentVoltage) {
                // Rising edge of differential voltage
                if (this.lastEdgeTime !== 0) {
                    const periodCycles = cpuCycles - this.lastEdgeTime;
                    if (periodCycles > 0) {
                        // Dynamically estimate frequency based on 16MHz (Uno) or 125MHz (Pico)
                        // If we are in RP2040 mode, clock cycles are much faster
                        // Let's store period in cycles; update() will scale it based on the CPU clock it discovers!
                        this.periods.push(periodCycles);
                        if (this.periods.length > 5) this.periods.shift();
                    }
                }
                this.lastEdgeTime = cpuCycles;
            }
        }
    }

    update(time: number, wires: any[], instances: BaseComponent[]) {
        super.update(time, wires, instances);
        
        let cpuHz = 16_000_000; // Default Uno
        const hasPico = instances.some(c => c.type.includes('pico') || c.type.includes('rp2040'));
        if (hasPico) {
            cpuHz = 125_000_000;
        }

        const timeNs = (time / cpuHz) * 1_000_000_000;

        if (this.lastUpdateTime === 0) {
            this.lastUpdateTime = timeNs;
        }

        // Silence timeout: if no edge has been registered for more than 100ms (0.1s worth of CPU cycles)
        const silenceTimeoutCycles = cpuHz * 0.1;
        if (this.lastEdgeTime !== 0 && (time - this.lastEdgeTime) > silenceTimeoutCycles) {
            this.periods = [];
            if (this.state.isBuzzing) {
                this.setState({ isBuzzing: false, frequency: 0, current: 0, voltageDrop: 0 });
            }
        }

        // Periodically update output state (every 50ms = 50,000,000ns)
        if (timeNs - this.lastUpdateTime > 50000000) {
            this.lastUpdateTime = timeNs;
            
            if (this.periods.length >= 2) {
                // Average periods in cycles
                const avgPeriodCycles = this.periods.reduce((a, b) => a + b, 0) / this.periods.length;
                if (avgPeriodCycles > 0) {
                    const freq = cpuHz / avgPeriodCycles;
                    
                    // Allow normal human hearing frequencies (20Hz to 20kHz)
                    if (freq >= 20 && freq <= 20000) {
                        if (!this.state.isBuzzing || Math.abs(this.state.frequency - freq) / freq > 0.01) {
                            this.setState({
                                isBuzzing: true,
                                frequency: freq,
                                voltageDrop: 3.3,
                                current: 0.015
                            });
                        }
                    }
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
