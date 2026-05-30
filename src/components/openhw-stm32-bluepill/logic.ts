import { BaseComponent } from '../BaseComponent';

export class STM32BluePillLogic extends BaseComponent {
  private irqEventCount = 0;
  private irqByPin: Record<string, number> = {};

  constructor(id: string, manifest: any) {
    super(id, manifest);
    this.state = {
      builtInLed: false, // PC13 is typically the built-in LED on Blue Pill, often active low
      ...this.state,
    };
  }

  onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
    this.irqEventCount += 1;
    this.irqByPin[pinId] = Number(this.irqByPin[pinId] || 0) + 1;

    if (pinId === 'PC13') {
      // Blue Pill PC13 LED is active LOW.
      this.setState({ builtInLed: !isHigh });
    }
  }

  update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
    // Runtime CPU integration for STM32 is handled in worker runners if supported,
    // or mocked here for visual integration.
  }

  onCustomTelemetry() {
    this.setCustomTelemetry({
        builtInLed: this.state.builtInLed,
        irqEventsTotal: this.irqEventCount,
        irqEventsByPin: { ...this.irqByPin },
    });
  }
}
