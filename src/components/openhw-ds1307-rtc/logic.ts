import { BaseComponent } from '../BaseComponent';
import { I2CProtocol } from '../../protocol-handlers/index';

// DS1307 Real-Time Clock — I2C address 0x68
//
// Real hardware behaviour:
//   - Maintains time independently using a 32.768kHz crystal + CR2032 battery
//   - Communicates over I2C (address 0x68)
//   - Registers: seconds(0), minutes(1), hours(2), day(3), date(4), month(5), year(6), control(7)
//   - Values stored in BCD format
//   - Arduino uses RTClib: RTC_DS1307 rtc; rtc.now() returns DateTime
//
// Simulation: time advances in real-time from the configured datetime attr.

const DS1307_ADDRESS = 0x68;

function toBCD(val: number): number {
    return ((Math.floor(val / 10) << 4) | (val % 10));
}

function fromBCD(bcd: number): number {
    return ((bcd >> 4) & 0x0f) * 10 + (bcd & 0x0f);
}

export class DS1307RTCLogic extends I2CProtocol {
    // Sim-time clock: elapsed derives from cpuCycles (16M cycles = 1 sim-s),
    // so replay/pause/determinism hold. Wall clock only seeds construction.
    private startCycles: number = 0;
    private startCyclesSet: boolean = false;
    private baseDate: Date;
    private powered: boolean = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        const dt = manifest.attrs?.datetime ?? '2024-01-01T00:00:00';
        this.baseDate = new Date(dt);

        this.state = {
            ...this.state,
            powered:  false,
            datetime: dt,
            display:  this.formatDisplay(this.baseDate),
        };
    }

    private currentDate(): Date {
        const cycles = (this as any).simCycles || 0;
        const elapsed = Math.floor((cycles - this.startCycles) / 16000000) * 1000;
        return new Date(this.baseDate.getTime() + Math.max(0, elapsed));
    }

    private formatDisplay(d: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        (this as any).simCycles = cpuCycles;
        if (!this.startCyclesSet) { this.startCycles = cpuCycles; this.startCyclesSet = true; }
        // Accept power from either VCC pin name or the '5V' alias that some wiring uses
        const vcc = Math.max(
            this.getPinVoltage('VCC'),
            this.getPinVoltage('VCC_2'),
            this.getPinVoltage('5V'),
        );
        this.powered = vcc >= 2.5;
        const now = this.currentDate();
        this.setState({
            powered:  this.powered,
            running:  this.powered,
            datetime: now.toISOString(),
            display:  this.formatDisplay(now),
        });
    }

    onI2CWriteRegister(reg: number, data: number[]): void {
        // Real DS1307: a write starting at register 0 sets the clock
        // (sec, min, hour-24h, dow, date, month, year-2000, control).
        // Accept the SET payload: rebase the sim-time clock so subsequent
        // reads tick forward from the written time instead of base 0:0:0.
        if (reg !== 0 || !data || data.length < 7) {
            if (reg === 7 && data && data.length >= 1) {
                this.state = { ...this.state, control: data[0] & 0xff };
            }
            return;
        }
        const sec = fromBCD(data[0] & 0x7f); // bit7 = CH (clock halt)
        const min = fromBCD(data[1] & 0x7f);
        const hrByte = data[2];
        const hour = (hrByte & 0x40)
            ? fromBCD(hrByte & 0x1f) + (((hrByte >> 5) & 1) ? 12 : 0) // 12h mode
            : fromBCD(hrByte & 0x3f); // 24h mode
        const date = Math.min(Math.max(fromBCD(data[4] & 0x3f), 1), 31);
        const month = Math.min(Math.max(fromBCD(data[5] & 0x1f), 1), 12);
        const year = 2000 + fromBCD(data[6]);
        const cycles = (this as any).simCycles || 0;
        this.baseDate = new Date(year, month - 1, date, hour, min, sec);
        this.startCycles = cycles;
        this.startCyclesSet = true;
        if (data.length >= 8) {
            this.state = { ...this.state, control: data[7] & 0xff };
        }
    }

    onI2CReadRequest(reg: number, count: number): number[] {
        const now = this.currentDate();
        const regs: Record<number, number> = {
            0: toBCD(now.getSeconds()),
            1: toBCD(now.getMinutes()),
            2: toBCD(now.getHours()),
            3: now.getDay() + 1,
            4: toBCD(now.getDate()),
            5: toBCD(now.getMonth() + 1),
            6: toBCD(now.getFullYear() % 100),
            7: 0x00, // control register
        };

        const result: number[] = [];
        let ptr = reg;
        for (let i = 0; i < count; i++) {
            result.push(regs[ptr] ?? 0xFF);
            ptr = (ptr + 1) % 8;
        }
        return result;
    }

    onCustomTelemetry() {
        const now = this.currentDate();
        this.setCustomTelemetry({
            time:     this.formatDisplay(now),
            running:  this.powered ? 'Yes' : 'No',
            datetime: now.toISOString(),
        });
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: powered} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {powered: (s.powered ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        {
const vcc = graph.get(`${component.id}.VCC`);
        const gnd = graph.get(`${component.id}.GND`);
        if (!vcc || vcc.length === 0) return `⚠️ [DS1307 ${component.id}] VCC not connected. Connect to 5V.`;
        if (!gnd || gnd.length === 0) return `⚠️ [DS1307 ${component.id}] GND not connected.`;
        return null;
        }

        /* --- next rule --- */
        {
const sda = graph.get(`${component.id}.SDA`);
        const scl = graph.get(`${component.id}.SCL`);
        if (!sda || sda.length === 0) return `⚠️ [DS1307 ${component.id}] SDA not connected. Connect to Arduino A4.`;
        if (!scl || scl.length === 0) return `⚠️ [DS1307 ${component.id}] SCL not connected. Connect to Arduino A5.`;
        return null;
        }
}
}
