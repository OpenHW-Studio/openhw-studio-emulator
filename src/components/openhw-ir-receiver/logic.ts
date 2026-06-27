import { BaseComponent } from '../BaseComponent';
import { PulseProtocol } from '../../protocol-handlers/index';
import { IREnvironment } from '../../protocol-handlers/ir-environment';
import { decodeIR, getIRProtocolSignal, formatIRValue, encodeIR } from '../../protocol-handlers/ir-protocols';
import type { IRProtocol, IRSignal, IRPulse } from '../../protocol-handlers/ir-protocols';

const ALL_PROTOCOLS: IRProtocol[] = ['NEC', 'NEC_EXT', 'SONY_12', 'SONY_15', 'SONY_20', 'RC5', 'RC6', 'SAMSUNG', 'JVC', 'PANASONIC'];

export class IRReceiverLogic extends PulseProtocol {
    private frequency: number = 38;
    private transmitting: boolean = false;
    private lastButton: string = '';
    private lastValue: number = 0;
    private lastProtocol: IRProtocol = 'NEC';
    private lastAddress: number = 0;
    private lastCommand: number = 0;
    private signalStrength: number = 0;
    private registered: boolean = false;
    private _posX: number = 0;
    private _posY: number = 0;

    // Output timing queue (same pattern as IRRemoteLogic)
    private outputQueue: { cycle: number; voltage: number }[] = [];
    private lastUpdateCycle: number = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.frequency = parseInt(manifest.attrs?.frequency ?? '38', 10);
        this.state = {
            ...this.state,
            powered: false,
            transmitting: false,
            lastButton: '',
            lastValue: '0x00000000',
            lastProtocol: 'NEC',
            lastAddress: '0x0000',
            lastCommand: '0x0000',
            lastSignalStr: '',
            signalStrength: 0,
            transmittersNearby: 0,
        };
    }

    private ensureRegistered(): void {
        if (this.registered) return;
        this.registered = true;
        IREnvironment.register({
            id: this.id,
            x: (this as any)._posX ?? 0,
            y: (this as any)._posY ?? 0,
            supportedProtocols: ALL_PROTOCOLS,
            coneAngle: 360,
            range: 1000,
            onIRSignalReceived: (signal: IRSignal, senderId: string) => {
                this.handleIRSignal(signal);
                return true;
            },
        });
    }

    private handleIRSignal(signal: IRSignal): void {
        if (!this.state.powered) return;

        this.lastProtocol = signal.protocol;
        this.lastAddress = signal.address;
        this.lastCommand = signal.command;
        this.lastButton = formatIRValue(signal.protocol, signal.address, signal.command);
        this.lastValue = signal.command;
        this.transmitting = true;

        // Output the demodulated waveform on OUT pin
        this.outputPulseTrain(signal.pulses);

        // Calculate approximate signal strength (based on pulse count / expected)
        const expectedLen = signal.pulses.length;
        this.signalStrength = Math.min(100, Math.round((expectedLen / 100) * 100));

        this.setState({
            powered: true,
            transmitting: true,
            lastButton: this.lastButton,
            lastValue: `0x${signal.command.toString(16).toUpperCase().padStart(8, '0')}`,
            lastProtocol: signal.protocol,
            lastAddress: `0x${signal.address.toString(16).toUpperCase().padStart(4, '0')}`,
            lastCommand: `0x${signal.command.toString(16).toUpperCase().padStart(4, '0')}`,
            lastSignalStr: formatIRValue(signal.protocol, signal.address, signal.command),
            signalStrength: this.signalStrength,
        });
    }

    private outputPulseTrain(pulses: IRPulse[]): void {
        this.outputQueue = [];
        let cycles = this.lastUpdateCycle;
        const cyclesPerUs = this.getCpuFrequencyHz() / 1000000;

        for (const pulse of pulses) {
            if (pulse.level) {
                // Mark (carrier present) -> OUT = LOW (active low)
                this.outputQueue.push({ cycle: cycles, voltage: 0 });
                cycles += Math.floor(pulse.durationUs * cyclesPerUs);
            } else {
                // Space (no carrier) -> OUT = HIGH (idle)
                this.outputQueue.push({ cycle: cycles, voltage: 5 });
                cycles += Math.floor(pulse.durationUs * cyclesPerUs);
            }
        }

        // Return to idle HIGH after transmission
        this.outputQueue.push({ cycle: cycles, voltage: 5 });
    }

    onEvent(event: any) {
        if (event.type === 'ir-send' && this.state.powered) {
            const btn = event.button as keyof typeof NEC_CODES;
            const code = NEC_CODES[btn];
            if (code !== undefined) {
                this.lastButton = btn;
                this.lastValue = code;
                this.lastProtocol = 'NEC';
                this.lastAddress = (code >> 16) & 0xFFFF;
                this.lastCommand = code & 0xFFFF;
                this.transmitting = true;

                // Generate proper NEC waveform instead of flat 200ms pulse
                const signal = getIRProtocolSignal('NEC', this.lastAddress, this.lastCommand);
                this.outputPulseTrain(signal.pulses);

                this.setState({
                    powered: true,
                    transmitting: true,
                    lastButton: btn,
                    lastValue: `0x${code.toString(16).toUpperCase().padStart(8, '0')}`,
                    lastProtocol: 'NEC',
                    lastAddress: `0x${this.lastAddress.toString(16).toUpperCase().padStart(4, '0')}`,
                    lastCommand: `0x${this.lastCommand.toString(16).toUpperCase().padStart(4, '0')}`,
                    lastSignalStr: formatIRValue('NEC', this.lastAddress, this.lastCommand),
                    signalStrength: 100,
                });
            }
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        super.update(cpuCycles, currentWires, allComponentsInstances);
        this.lastUpdateCycle = cpuCycles;

        this.ensureRegistered();

        const posX = (this as any)._posX;
        const posY = (this as any)._posY;
        if (typeof posX === 'number' && typeof posY === 'number') {
            IREnvironment.updatePosition(this.id, posX, posY);
        }

        const vcc = this.getPinVoltage('VCC');
        const isPowered = vcc > 2.5;

        if (!isPowered) {
            if (this.state.powered || this.transmitting) {
                this.transmitting = false;
                this.outputQueue = [];
                this.setState({ powered: false, transmitting: false });
            }
            return;
        }

        if (!this.state.powered) {
            this.setState({ powered: true });
        }

        // Process output queue (same pattern as IRRemoteLogic)
        if (this.outputQueue.length > 0) {
            while (this.outputQueue.length > 0 && cpuCycles >= this.outputQueue[0].cycle) {
                const ev = this.outputQueue.shift();
                if (ev) {
                    this.setPinVoltage('OUT', ev.voltage);
                }
            }

            if (this.outputQueue.length === 0) {
                this.transmitting = false;
                this.setState({ powered: true, transmitting: false });
            }
        } else if (!this.transmitting) {
            // Idle state is HIGH
            this.setPinVoltage('OUT', 5.0);
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            powered: Boolean(this.state.powered),
            transmitting: Boolean(this.state.transmitting),
            lastButton: String(this.state.lastButton || 'None'),
            lastValue: String(this.state.lastValue || '0x00000000'),
            lastProtocol: String(this.state.lastProtocol || ''),
            lastAddress: String(this.state.lastAddress || ''),
            lastCommand: String(this.state.lastCommand || ''),
            signalStrength: this.signalStrength,
        });
    }
}

// NEC codes kept for backward-compatible virtual remote
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
