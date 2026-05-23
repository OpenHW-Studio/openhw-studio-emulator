import { BaseComponent } from '../BaseComponent';

export class LDRResistorLogic extends BaseComponent {
  r10: number = 10000; // Resistance at 10 lux (Ohms)
  gamma: number = 0.7; // Light-dependent coefficient
  lux: number = 100; // Current light intensity

  // Voltage tracking for telemetry
  v1: number = 0;
  v2: number = 0;

  constructor(attrs: any) {
    super(attrs);
    this.r10 = parseFloat(attrs?.r10) || 10000;
    this.gamma = parseFloat(attrs?.gamma) || 0.7;
    this.lux = parseFloat(attrs?.lux) || 100;

    this.state = {
      resistance: this.calculateResistance(),
      lux: this.lux,
      voltage: 0,
      current: 0,
      power: 0
    };
  }

  /**
   * Calculate LDR resistance using photoresistor formula:
   * R = R10 * (10 / Lux)^gamma
   *
   * Where:
   * - R10 is resistance at 10 lux
   * - Lux is current light intensity
   * - Gamma is the light-dependent coefficient (typically 0.5-1.0)
   */
  private calculateResistance(): number {
    if (this.lux <= 0) {
      return this.r10 * Math.pow(10, this.gamma); // Near darkness
    }
    
    const exponent = this.gamma;
    const ratio = 10 / this.lux;
    const resistance = this.r10 * Math.pow(ratio, exponent);

    return Math.max(resistance, 1); // Minimum 1 Ohm
  }

  /**
   * Update voltage at pins and calculate derived values
   */
  onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
    // LDR is passive - doesn't actively change pin state
    // Just tracks voltages for telemetry
  }

  /**
   * Called by circuit solver to get conductance for MNA analysis
   */
  getConductance(): number {
    const resistance = this.calculateResistance();
    if (resistance === 0) return Infinity;
    return 1 / resistance;
  }

  /**
   * Simulate light level changes (for testing/animation)
   */
  setLux(luxValue: number) {
    this.lux = Math.max(1, luxValue);
    this.state.lux = this.lux;
    this.state.resistance = this.calculateResistance();
    this.stateChanged = true;
  }

  tick() {
    // Update voltage difference and calculate current
    const vDiff = Math.abs(this.v1 - this.v2);
    const resistance = this.calculateResistance();
    const current = vDiff / resistance; // Ohm's Law: I = V/R
    const power = current * vDiff; // P = V*I

    this.state.voltage = vDiff;
    this.state.current = current * 1000; // Convert to mA
    this.state.power = power;
    this.state.resistance = resistance;
  }

  getPinVoltage(pinId: string): number {
    return pinId === 'p1' ? this.v1 : this.v2;
  }

  getState() {
    return this.state;
  }

  reset() {
    this.lux = 100;
    this.v1 = 0;
    this.v2 = 0;
    this.state.resistance = this.calculateResistance();
    this.state.lux = this.lux;
    this.state.voltage = 0;
    this.state.current = 0;
    this.state.power = 0;
  }
}
