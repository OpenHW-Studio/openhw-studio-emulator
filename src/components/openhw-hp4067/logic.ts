import { BaseComponent } from '../BaseComponent';

// HP4067 / CD74HC4067 16-channel analog multiplexer.
//
// Real part: S0..S3 select one of C0..C15 onto the common SIG pin; EN is
// active LOW (high = all channels disconnected / high-Z). This is a passive
// analog switch, so the selected channel's voltage appears on SIG (no
// amplification): the runner reads SIG through the board ADC and sees the
// channel source.
//
// The frontend registry had a pin map for this part but no logic class, so
// the model stayed inert (`liveOop {}`) on every board. This class closes
// that gap: it follows the same contract as logic-mux-2to1 (state +
// getPinVoltage override) so the Pico/F1 ADC pumps can read it.
export class HP4067Logic extends BaseComponent {
    private activeChannel = 0;
    private enabled = false;
    private sigVoltage = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            ...this.state,
            activeChannel: 0,
            enabled: false,
            sigVoltage: 0,
        };
    }

    private readSelect(pinId: string): number {
        return this.getPinVoltage(pinId) >= 1.65 ? 1 : 0;
    }

    /** Voltage on C<n>: own pin first (GPIO fan-out writes it), otherwise
     *  resolve a direct rail wire (3V3/5V/GND) or another component pin. */
    private channelVoltage(channel: number, wires: any[], instances: BaseComponent[]): number {
        const pinId = `C${channel}`;
        const own = this.getPinVoltage(pinId);
        const key = `${this.id}:${pinId}`;
        const byId = new Map<string, BaseComponent>();
        for (const inst of instances || []) {
            if (inst && (inst as any).id) byId.set(String((inst as any).id), inst);
        }
        for (const w of wires || []) {
            if (!w || (w.from !== key && w.to !== key)) continue;
            const other = w.from === key ? w.to : w.from;
            if (typeof other !== 'string') continue;
            const sep = other.indexOf(':');
            if (sep < 0) continue;
            const compId = other.slice(0, sep);
            const otherPin = other.slice(sep + 1);
            const inst = byId.get(compId);
            if (inst) {
                const v = Number(inst.getPinVoltage(otherPin));
                if (Number.isFinite(v) && v > 0) return v;
                continue;
            }
            // No instance: board rail. Pico 3V3/5V are stiff sources.
            if (/^(3V3|3\.3V|VCC|VDD)([._]?\d*)?$/i.test(otherPin)) return 3.3;
            if (/^(5V|VBUS|VSYS|VIN)([._]?\d*)?$/i.test(otherPin)) return 5.0;
            if (/^(GND|AGND)([._]?\d*)?$/i.test(otherPin)) return 0;
        }
        return own;
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        super.update(cpuCycles, currentWires, allComponentsInstances);

        const channel = this.readSelect('S0')
            | (this.readSelect('S1') << 1)
            | (this.readSelect('S2') << 2)
            | (this.readSelect('S3') << 3);
        // EN is active LOW: a high (or floating-high) input disconnects SIG.
        const enabled = this.getPinVoltage('EN') < 1.65;
        const volts = enabled
            ? this.channelVoltage(channel, currentWires, allComponentsInstances)
            : 0;

        if (this.activeChannel !== channel || this.enabled !== enabled
            || Math.abs(this.sigVoltage - volts) > 0.01) {
            this.activeChannel = channel;
            this.enabled = enabled;
            this.sigVoltage = volts;
            this.state = {
                ...this.state,
                activeChannel: channel,
                enabled,
                sigVoltage: Number(volts.toFixed(3)),
            };
            this.stateChanged = true;
        }

        if (!this.pins['SIG']) this.pins['SIG'] = { voltage: 0, mode: 'OUTPUT' };
        this.pins['SIG'].voltage = volts;
    }

    getPinVoltage(pinId: string): number {
        if (pinId === 'SIG') return this.sigVoltage;
        return super.getPinVoltage(pinId);
    }
}
