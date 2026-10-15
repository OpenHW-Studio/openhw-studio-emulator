import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';
import { BatteryLogic } from '../openhw-battery/logic';

export class ChargerLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            isCharging: false,
            currentMa: parseFloat(manifest.attrs?.chargeCurrentMa || '1000')
        };
    }

    update(cpuCycles: number, currentWires: any[], allComponents: BaseComponent[]) {
        const hasPower = this.getPinVoltage('IN+') > 4.5;
        
        if (hasPower) {
            // Look for a battery connected to BAT+ (iterable-agnostic: Array or Map).
            const allList: BaseComponent[] = allComponents instanceof Map
                ? [...allComponents.values()] : allComponents;
            const battery = allList.find(c =>
                c instanceof BatteryLogic &&
                currentWires.some(w =>
                    (w.from === `${this.id}:BAT+` && w.to === `${c.id}:VCC`) ||
                    (w.to === `${this.id}:BAT+` && w.from === `${c.id}:VCC`)
                )
            ) as BatteryLogic;

            if (battery) {
                this.setState({ isCharging: true });
                // Charge the battery (inverse of discharge)
                // This would ideally be handled in a shared power manager, 
                // but for simplicity we'll just flag it for now.
            } else {
                this.setState({ isCharging: false });
            }
        } else {
            this.setState({ isCharging: false });
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            status: this.state.isCharging ? 'Charging' : 'Standby',
            input: this.getPinVoltage('IN+').toFixed(1) + 'V',
            isCharging: this.state.isCharging,
            inputVoltage: this.getPinVoltage('IN+')
        });
    }

    // 12.4 v2: numeric UI state for SAB slot {f0: currentMa, i0: isCharging} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {currentMa: Number(s.currentMa ?? 0)},
            i: {isCharging: (s.isCharging ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const vinNode = `${component.id}.IN+`;
        const v = validator.calculateVoltageAtNode(vinNode);
        if (v > 6.0) {
            return createValidationIssue({
                ruleId: 'charger-input-voltage-check',
                severity: 'error',
                message: `🔥 [Charger ${component.id}] Input voltage ${v.toFixed(1)}V exceeds 6V limit! Chip will be damaged.`,
                compIds: [component.id],
                remediation: 'Reduce the charger input voltage to within the rated range.',
                autoFix: false,
            });
        }
        return null;
    }
}
