import { BaseComponent } from '../BaseComponent';
import { I2CProtocol } from '../../protocol-handlers/index';
import { HD44780Controller } from '../../protocol-handlers/hd44780-controller';

export class Lcd2004I2CLogic extends I2CProtocol {
    private hd44780 = new HD44780Controller(4, 20);
    private lastByte = 0;
    private pendingSync = false;
    private lastFlushMs = 0;
    private lastI2CActivityMs = 0;
    private lastI2CActivityCycles = 0; // cycle-based debounce (no Date.now in tick)
    private simCycles = 0;
    private lastFlushCycles = 0;

    private static readonly FLUSH_INTERVAL_MS = 40;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { ...this.state, ...this.hd44780.getState() };
    }

    onI2CByte(addr: number, value: number) {
        this.lastByte = this.hd44780.feedI2CByte(value, this.lastByte);
        if (this.hd44780.stateChanged) {
            this.pendingSync = true;
            this.lastI2CActivityMs = Date.now(); // legacy wall stamp (non-tick)
            this.lastI2CActivityCycles = this.simCycles;
            this.hd44780.clearChanged();
        }
        return true;
    }

    update(cpuCycles: number, wires: any, allComponents: any) {
        if (!this.pendingSync) return;
        this.simCycles = cpuCycles;

        // Debounce in cycles (16MHz): 40ms silence = 640k cycles, 200ms starve = 3.2M.
        const idleCycles = cpuCycles - this.lastI2CActivityCycles;
        const isIdle = idleCycles >= 640000;
        const isStarved = this.lastFlushCycles > 0 && (cpuCycles - this.lastFlushCycles) >= 3200000;

        if (!isIdle && !isStarved) {
            return;
        }

        this.lastFlushCycles = cpuCycles;
        this.lastFlushMs = Math.floor(cpuCycles / 16000);
        this.pendingSync = false;
        this.setState({ ...this.state, ...this.hd44780.getState() });
    }

    onCustomTelemetry() {
        const textContent = this.hd44780.getLines().map(l => l.trimEnd()).join('\n').trimEnd();
        this.setCustomTelemetry({
            i2cAddress: `0x${this.getI2CAddress().toString(16).toUpperCase()}`,
            textContent: textContent || '<empty>',
            backlight: this.hd44780.getBacklight(),
            lineCount: 4,
            charsPerLine: 20,
        });
    }

    getSyncState() {
        return { ...this.state };
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: backlight} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {backlight: (s.backlight ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        void validator;
        const pin = graph.get(`${component.id}.SDA`);
        if (!pin || pin.length === 0) {
            return {
                ruleId: 'openhw-lcd2004-i2c-check',
                severity: 'warn',
                message: `[${component.id}] Warning: SDA is not connected.`,
                compIds: [component.id],
            };
        }
        return null;
    }
}
