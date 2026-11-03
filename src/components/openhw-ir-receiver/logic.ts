import { BaseComponent } from '../BaseComponent';
import { createValidationIssue } from '../component-schema.js';
import { PulseProtocol } from '../../protocol-handlers/index';

// IR Receiver (e.g. VS1838B)
// Demodulates 38 kHz infrared signals and outputs active-LOW digital pulses.
//
// Virtual Remote NEC Codes (Standard NEC 32-bit protocol):
const NEC_CODES: Record<string, number> = {
    'POWER': 0xE0E040BF,
    'VOL+':  0xE0E0E01F,
    'VOL-':  0xE0E0D02F,
    'MUTE':  0xE0E0F00F,
    'CH+':   0xE0E048B7,
    'CH-':   0xE0E008F7,
    'OK':    0xE0E016E9,
    'UP':    0xE0E006F9,
    'DOWN':  0xE0E08679,
    'LEFT':  0xE0E0A659,
    'RIGHT': 0xE0E046B9,
    '1':     0xE0E020DF,
    '2':     0xE0E0A05F,
    '3':     0xE0E0609F,
    '4':     0xE0E010EF,
    '5':     0xE0E0906F,
    '6':     0xE0E050AF,
    '7':     0xE0E030CF,
    '8':     0xE0E0B04F,
    '9':     0xE0E0708F,
    '0':     0xE0E08877,
};

export class IRReceiverLogic extends PulseProtocol {
    private frequency: number = 38; // kHz
    private transmitting: boolean = false;
    private lastButton: string = '';
    private lastValue: number = 0;
    private _simCpu?: any;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.frequency = parseInt(manifest.attrs?.frequency ?? '38', 10);
        this.state = {
            ...this.state,
            powered: true,
            transmitting: false,
            lastButton: '',
            lastValue: '0x00000000',
        };
        this.driveOut(5.0);
    }

    public getConnectedBoardPin(): string | null {
        if ((this as any)._connectedPin != null) return (this as any)._connectedPin;
        try {
            const netOf = (this as any)._boardNetOf;
            if (typeof netOf === 'function') {
                for (const pn of ['OUT', 'R']) {
                    const pin = netOf(pn);
                    if (pin) { (this as any)._connectedPin = pin; return pin; }
                }
            }
        } catch { /* fall through to legacy scan */ }
        const runner = (this as any)._simCpu?._avrRunner;
        if (runner?.currentWires) {
            for (const wire of runner.currentWires) {
                const from: string = wire.from || '';
                const to: string = wire.to || '';
                if (from === `${this.id}:OUT` || from === `${this.id}.OUT` || from === `${this.id}:R` || from === `${this.id}.R`) {
                    const parts = to.split(/[:\.]/);
                    const pin = parts[1] ?? null;
                    if (pin) {
                        (this as any)._connectedPin = pin;
                        return pin;
                    }
                } else if (to === `${this.id}:OUT` || to === `${this.id}.OUT` || to === `${this.id}:R` || to === `${this.id}.R`) {
                    const parts = from.split(/[:\.]/);
                    const pin = parts[1] ?? null;
                    if (pin) {
                        (this as any)._connectedPin = pin;
                        return pin;
                    }
                }
            }
        }
        return null;
    }

    public getBoardPin(): string | null {
        return this.getConnectedBoardPin();
    }

    private driveOut(voltage: number) {
        (this as any)._drivingBus = true;
        (this as any)._lastDrivenVoltage = voltage;
        if (!this.pins['OUT']) this.pins['OUT'] = { voltage: 5.0, mode: 'OUTPUT' };
        this.pins['OUT'].voltage = voltage;
        try { this.setPinVoltage('OUT', voltage); } catch (_) {}

        const isHigh = voltage > 1.8;
        const boardPin = this.getConnectedBoardPin();
        if (boardPin && typeof (this as any)._driveBoardPin === 'function') {
            (this as any)._driveBoardPin(boardPin, isHigh);
        } else if (boardPin && typeof (this as any)._setAvrPinDirect === 'function') {
            (this as any)._setAvrPinDirect(boardPin, isHigh);
        }

        if ((this as any)._simUpdatePhysics) {
            (this as any)._simUpdatePhysics();
        }
    }

    private transmitNEC(code: number) {
        // Runner-agnostic clock service first (plan §5.3); legacy AVR clock
        // fallback; wall-clock timeout last. Identical pulse order either way.
        const sched = (this as any)._scheduleBoardCycles;
        const cpu = (this as any)._simCpu;
        const pulses: { isHigh: boolean; durationUs: number }[] = [];

        // 1. Leader pulse: 9000us mark (LOW), 4500us space (HIGH)
        pulses.push({ isHigh: false, durationUs: 9000 });
        pulses.push({ isHigh: true, durationUs: 4500 });

        // 2. 32-bit NEC code (MSB first)
        for (let i = 31; i >= 0; i--) {
            const bit = (code >>> i) & 1;
            // Bit Mark is 562us LOW
            pulses.push({ isHigh: false, durationUs: 562 });
            // Bit Space is 1687us HIGH for '1', 562us HIGH for '0'
            pulses.push({ isHigh: true, durationUs: bit === 1 ? 1687 : 562 });
        }

        // 3. Stop bit: 562us mark (LOW), then return to HIGH idle
        pulses.push({ isHigh: false, durationUs: 562 });
        pulses.push({ isHigh: true, durationUs: 1000 });

        // Schedule pulse train using board clock service, CPU clock events or fallback timeout
        if (typeof sched === 'function') {
            let accumulatedCycles = 0;
            for (const p of pulses) {
                const targetCycles = accumulatedCycles;
                const v = p.isHigh ? 5.0 : 0.0;
                sched(() => {
                    this.driveOut(v);
                }, targetCycles);
                accumulatedCycles += p.durationUs * 16;
            }
            sched(() => {
                this.transmitting = false;
                this.setState({ powered: true, transmitting: false });
            }, accumulatedCycles);
        } else if (cpu && typeof cpu.addClockEvent === 'function') {
            let accumulatedCycles = 0;
            for (const p of pulses) {
                const targetCycles = accumulatedCycles;
                const v = p.isHigh ? 5.0 : 0.0;
                cpu.addClockEvent(() => {
                    this.driveOut(v);
                }, targetCycles);
                accumulatedCycles += p.durationUs * 16;
            }
            cpu.addClockEvent(() => {
                this.transmitting = false;
                this.setState({ powered: true, transmitting: false });
            }, accumulatedCycles);
        } else {
            let accumulatedMs = 0;
            for (const p of pulses) {
                const v = p.isHigh ? 5.0 : 0.0;
                const ms = accumulatedMs;
                setTimeout(() => {
                    this.driveOut(v);
                }, ms);
                accumulatedMs += p.durationUs / 1000;
            }
            setTimeout(() => {
                this.transmitting = false;
                this.setState({ powered: true, transmitting: false });
            }, accumulatedMs);
        }
    }

    onEvent(event: any) {
        if (!event) return;
        const evtType = event.type || event.event;
        const btn = event.button || event.value || event.key;
        if (evtType === 'ir-send' || evtType === 'ir_send' || evtType === 'button_click' || evtType === 'SET_ATTR') {
            const code = NEC_CODES[btn] ?? (typeof btn === 'number' ? btn : undefined);
            if (code !== undefined) {
                this.lastButton = String(btn);
                this.lastValue = code;
                this.transmitting = true;
                
                this.setState({
                    powered: true,
                    transmitting: true,
                    lastButton: String(btn),
                    lastValue: `0x${code.toString(16).toUpperCase()}`,
                });

                this.transmitNEC(code);
            }
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        super.update(cpuCycles, currentWires, allComponentsInstances);
        
        const vcc = this.getPinVoltage('VCC') || this.getPinVoltage('5V') || this.getPinVoltage('V') || this.getPinVoltage('3V3');
        const hasPowerPin = this.pins['VCC'] !== undefined || this.pins['5V'] !== undefined || this.pins['V'] !== undefined;
        const isPowered = hasPowerPin ? vcc > 2.5 : true;

        if (!isPowered) {
            if (this.state.powered || this.transmitting) {
                this.transmitting = false;
                this.setState({ powered: false, transmitting: false });
            }
            return;
        }

        if (!this.transmitting) {
            this.driveOut(5.0);
            if (!this.state.powered) {
                this.setState({ powered: true });
            }
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            powered: Boolean(this.state.powered),
            transmitting: Boolean(this.state.transmitting),
            lastButton: String(this.state.lastButton || 'None'),
            lastValue: String(this.state.lastValue || '0x00000000'),
        });
    }

    // 12.4 v2: numeric UI state for SAB slot {i0: powered} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {powered: ((this as any).powered ? 1 : 0)},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        {
const vcc = graph.get(`${component.id}.VCC`) || [];
        const gnd = graph.get(`${component.id}.GND`) || [];
        const issues = [];

        if (vcc.length === 0) {
            issues.push(createValidationIssue({
                ruleId: 'ir-receiver-power-check',
                severity: 'warn',
                message: `⚠️ [IR Receiver ${component.id}] VCC not connected. Connect to 3.3V or 5V.`,
                compIds: [component.id],
                remediation: 'Connect VCC to the power rail.',
                autoFix: true,
            }));
        }
        if (gnd.length === 0) {
            issues.push(createValidationIssue({
                ruleId: 'ir-receiver-power-check',
                severity: 'warn',
                message: `⚠️ [IR Receiver ${component.id}] GND not connected.`,
                compIds: [component.id],
                remediation: 'Connect GND to the common ground rail.',
                autoFix: true,
            }));
        }
        return issues.length > 0 ? issues : null;
        }

        /* --- next rule --- */
        {
const out = graph.get(`${component.id}.OUT`) || [];
        if (out.length === 0) {
            return createValidationIssue({
                ruleId: 'ir-receiver-out-check',
                severity: 'warn',
                message: `⚠️ [IR Receiver ${component.id}] OUT pin not connected. Connect to a digital pin.`,
                compIds: [component.id],
                remediation: 'Connect the OUT pin to an MCU digital pin.',
                autoFix: true,
            });
        }
        return null;
        }

        /* --- next rule --- */
        {
const out = graph.get(`${component.id}.OUT`) || [];
        const hasDigital = out.some((c: string) =>
            !c.includes(':A0') && !c.includes(':A1') &&
            !c.includes(':A2') && !c.includes(':A3')
        );
        if (out.length > 0 && !hasDigital) {
            return createValidationIssue({
                ruleId: 'ir-receiver-digital-check',
                severity: 'warn',
                message: `⚠️ [IR Receiver ${component.id}] OUT should connect to a digital pin (e.g. D2–D13), not an analog-only pin.`,
                compIds: [component.id],
                remediation: 'Move OUT connection to a digital pin.',
                autoFix: false,
            });
        }
        return null;
        }
}
}
