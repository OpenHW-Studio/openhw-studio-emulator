import { BaseComponent } from '../BaseComponent';
import { I2CProtocol } from '../../protocol-handlers/index';
import { HD44780Controller } from '../../protocol-handlers/hd44780-controller';

export class Lcd1602I2CLogic extends I2CProtocol {
    private hd44780 = new HD44780Controller(2, 16);
    private lastByte = 0;
    private pendingSync = false;
    private lastFlushMs = 0;

    private static readonly FLUSH_INTERVAL_MS = 40;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { ...this.state, ...this.hd44780.getState() };
    }

    onI2CByte(addr: number, value: number) {
        this.lastByte = this.hd44780.feedI2CByte(value, this.lastByte);
        if (this.hd44780.stateChanged) {
            this.pendingSync = true;
            this.hd44780.clearChanged();
        }
        return true;
    }

    update(cpuCycles: number, wires: any, allComponents: any) {
        if (!this.pendingSync) return;

        const now = Date.now();
        if (this.lastFlushMs && (now - this.lastFlushMs) < Lcd1602I2CLogic.FLUSH_INTERVAL_MS) {
            return;
        }

        this.lastFlushMs = now;
        this.pendingSync = false;
        this.setState({ ...this.state, ...this.hd44780.getState() });
    }

    onCustomTelemetry() {
        const textContent = this.hd44780.getLines().map(l => l.trimEnd()).join('\n').trimEnd();
        this.setCustomTelemetry({
            i2cAddress: `0x${this.getI2CAddress().toString(16).toUpperCase()}`,
            textContent: textContent || '<empty>',
            backlight: this.hd44780.getBacklight(),
            lineCount: 2,
            charsPerLine: 16,
        });
    }

    getSyncState() {
        return { ...this.state };
    }
}
