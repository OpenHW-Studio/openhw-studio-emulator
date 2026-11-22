import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';

export class UnoLogic extends BaseComponent {
    private txTimeout: any = null;
    private rxTimeout: any = null;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            txActive: false,
            rxActive: false,
            ...this.state
        };
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        // RX is pin 0, TX is pin 1
        if (pinId === '0') {
            this.setState({ rxActive: true });
            if (this.rxTimeout) clearTimeout(this.rxTimeout);
            this.rxTimeout = setTimeout(() => {
                this.setState({ rxActive: false });
                this.rxTimeout = null;
            }, 100);
        } else if (pinId === '1') {
            this.setState({ txActive: true });
            if (this.txTimeout) clearTimeout(this.txTimeout);
            this.txTimeout = setTimeout(() => {
                this.setState({ txActive: false });
                this.txTimeout = null;
            }, 100);
        } else if (pinId === '13') {
            this.setState({ pin13Active: isHigh });
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        // Nothing right now, pin states are driven directly by avr8js in the worker
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
        {
const i2cPins = ["A4", "A5"];
        const issues = [];

        i2cPins.forEach(pinName => {
            const pinNode = `${component.id}.${pinName}`;
            const connections = graph.get(pinNode);

            if (!connections || connections.length === 0) return;

            if (!validator?.hasResistivePathToSupply(pinNode)) {
                issues.push(createValidationIssue({
                    ruleId: 'arduino-uno-i2c-pullups',
                    severity: 'warn',
                    message: `⚠️ [Arduino ${component.id}] I2C PULLUP WARNING: ${pinNode} is in use but missing a Pull-Up resistor to VCC. I2C devices will fail. (Ignore if used for Analog Read)`,
                    compIds: [component.id],
                    remediation: 'Add an I2C pull-up resistor to VCC.',
                }));
            }
        });

        return issues.length > 0 ? issues : null;
        }

        /* --- next rule --- */
        {
const vinConns = graph.get(`${component.id}.vin`) || [];
        const v5Conns = graph.get(`${component.id}.5V`) || [];

        const vinVolts = validator?.calculateVoltageAtNode(`${component.id}.vin`);
        const v5Volts = validator?.calculateVoltageAtNode(`${component.id}.5V`);
        const issues = [];

        if (vinConns.length > 0 && vinVolts > 12.0) {
            issues.push(createValidationIssue({
                ruleId: 'arduino-uno-power-input',
                severity: 'error',
                message: `🔥 [Arduino ${component.id}] FRIED: ${vinVolts}V applied to VIN. Max is 12V.`,
                compIds: [component.id],
                remediation: 'Keep VIN below 12V.',
            }));
        }

        if (v5Conns.length > 0 && v5Volts > 5.5) {
            issues.push(createValidationIssue({
                ruleId: 'arduino-uno-power-input',
                severity: 'error',
                message: `🔥 [Arduino ${component.id}] FRIED: ${v5Volts}V applied to 5V pin. Bypassed internal regulator!`,
                compIds: [component.id],
                remediation: 'Do not inject more than 5.5V into the 5V pin.',
            }));
        }

        return issues.length > 0 ? issues : null;
        }
}
}
