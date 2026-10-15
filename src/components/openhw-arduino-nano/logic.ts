import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';

export class ArduinoNanoLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
    }

    onPinStateChange() {
        // Logic handled intrinsically by the backend ATmega328P execution core interception.
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
        const i2cPins = ["A4", "A5"];
        const issues = [];

        i2cPins.forEach(pinName => {
            const pinNode = `${component.id}.${pinName}`;
            if (((validator ? validator.getNeighbors(pinNode) : (graph.get(pinNode) || []))).length > 0) {
                const hasPullup = validator.findSeriesResistance(pinNode) > 0;
                if (!hasPullup) {
                    issues.push(createValidationIssue({
                        ruleId: 'arduino-nano-i2c-pullups',
                        severity: 'warn',
                        message: `⚠️ [Nano ${component.id}] I2C PULLUP WARNING: ${pinNode} is in use but missing a Pull-Up resistor to VCC.`,
                        compIds: [component.id],
                        remediation: 'Add a pull-up resistor to VCC.',
                    }));
                }
            }
        });

        return issues.length > 0 ? issues : null;
    }
}
