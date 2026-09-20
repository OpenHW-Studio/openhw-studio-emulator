import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';

function normalizePicoPin(pinId: string): string {
  const s = String(pinId || '').toUpperCase();
  if (/^GPIO\d+$/.test(s)) return `GP${s.slice(4)}`;
  if (/^D\d+$/.test(s)) return `GP${s.slice(1)}`;
  if (/^\d+$/.test(s)) return `GP${s}`;
  return s;
}

export class PicoLogic extends BaseComponent {
  private txTimeout: any = null;
  private rxTimeout: any = null;
  private irqEventCount = 0;
  private irqByPin: Record<string, number> = {};

  constructor(id: string, manifest: any) {
    super(id, manifest);
    this.state = {
      txActive: false,
      rxActive: false,
      builtInLed: false,
      ...this.state,
    };
  }

  onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
    super.onPinStateChange(pinId, isHigh, cpuCycles);
    const pin = normalizePicoPin(pinId);
    this.irqEventCount += 1;
    this.irqByPin[pin] = Number(this.irqByPin[pin] || 0) + 1;

    // Default UART0 on Pico is GP0 (TX) and GP1 (RX)
    if (pin === 'GP1' || pin === 'GP5') {
      this.setState({ rxActive: true });
      if (this.rxTimeout) clearTimeout(this.rxTimeout);
      this.rxTimeout = setTimeout(() => {
        this.setState({ rxActive: false });
        this.rxTimeout = null;
      }, 100);
    } else if (pin === 'GP0' || pin === 'GP4') {
      this.setState({ txActive: true });
      if (this.txTimeout) clearTimeout(this.txTimeout);
      this.txTimeout = setTimeout(() => {
        this.setState({ txActive: false });
        this.txTimeout = null;
      }, 100);
    } else if (pin === 'GP25') {
      this.setState({ builtInLed: !!isHigh });
    }
  }

  update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
    // Runtime CPU integration for RP2040 is handled in worker runners.
  }

  onCustomTelemetry() {
    this.setCustomTelemetry({
        txActive: this.state.txActive,
        rxActive: this.state.rxActive,
        builtInLed: this.state.builtInLed,
        irqEventsTotal: this.irqEventCount,
        irqEventsByPin: { ...this.irqByPin },
    });
  }

    // 12.4 v2: numeric UI state for SAB slot {i0: rxActive} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {rxActive: (s.rxActive ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const vbusVolts = validator?.calculateVoltageAtNode(`${component.id}.VBUS`) || 0;
        const v3Volts = validator?.calculateVoltageAtNode(`${component.id}.3V3`) || 0;

        if (vbusVolts > 5.5) {
          return createValidationIssue({
            ruleId: 'rp2040-power-input-check',
            severity: 'error',
            message: `🔥 [Pico ${component.id}] ${vbusVolts}V applied to VBUS. Max expected is 5V USB input.`,
            compIds: [component.id],
            remediation: 'Keep VBUS at USB-level voltages.',
            autoFix: false,
          });
        }

        if (v3Volts > 3.6) {
          return createValidationIssue({
            ruleId: 'rp2040-power-input-check',
            severity: 'error',
            message: `🔥 [Pico ${component.id}] ${v3Volts}V applied to 3V3 rail.`,
            compIds: [component.id],
            remediation: 'Keep the 3V3 rail within the RP2040 logic range.',
            autoFix: false,
          });
        }

        return null;
    }
}
