import { BaseComponent } from '../BaseComponent';
import { IREnvironment, IRReceiverInfo } from '../../protocol-handlers/ir-environment';
import { encodeIR, getIRProtocolSignal, decodeIR, formatIRValue } from '../../protocol-handlers/ir-protocols';
import type { IRProtocol, IRPulse } from '../../protocol-handlers/ir-protocols';

const PROTOCOLS: IRProtocol[] = ['NEC', 'NEC_EXT', 'SONY_12', 'SONY_15', 'SONY_20', 'RC5', 'RC6', 'SAMSUNG', 'JVC', 'PANASONIC'];

export class IRTransmitterLogic extends BaseComponent {
    private protocol: IRProtocol = 'NEC';
    private address: number = 0;
    private command: number = 64;
    private toggleBit: number = 0;
    private range: number = 300;
    private coneAngle: number = 30;
    private active: boolean = false;
    private _posX: number = 0;
    private _posY: number = 0;
    private registered: boolean = false;
    private nearbyReceivers: IRReceiverInfo[] = [];
    private lastSignalSummary: string = '';
    private lastScanCycle: number = -1000000;

    private lastEdgeCycle: number = 0;
    private isMark: boolean = false;
    private segmentStartCycle: number = 0;
    private pulses: IRPulse[] = [];
    private lastTransmissionCycle: number = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.suppressPinUiUpdates = true;
        const a = manifest.attrs || {};
        this.protocol = (PROTOCOLS.includes(a.protocol) ? a.protocol : 'NEC') as IRProtocol;
        this.address = parseInt(a.address ?? '0', 10);
        this.command = parseInt(a.command ?? '64', 10);
        this.toggleBit = parseInt(a.toggleBit ?? '0', 10);
        this.range = parseInt(a.range ?? '300', 10);
        this.coneAngle = parseInt(a.coneAngle ?? '30', 10);
        this.state = {
            ...this.state,
            protocol: this.protocol,
            address: this.address,
            command: this.command,
            addressHex: '0000',
            commandHex: '0040',
            active: false,
            receiversInRange: 0,
            lastSignal: '',
            txPosX: 0,
            txPosY: 0,
        };
    }

    private ensureRegistered(): void {
        if (this.registered) return;
        this.registered = true;
        // _posX/_posY set by runner from canvas position
        IREnvironment.register({
            id: this.id,
            x: (this as any)._posX ?? 0,
            y: (this as any)._posY ?? 0,
            supportedProtocols: PROTOCOLS,
            coneAngle: this.coneAngle,
            range: this.range,
            onIRSignalReceived: (_signal, _senderId) => false,
        });
    }

    onEvent(event: any): void {
        if (!event) return;

        if (event.type === 'ir-send' || event.type === 'button_press') {
            const btn = event.button;
            // If button is in PROTOCOLS list, it's a protocol change
            if (btn && PROTOCOLS.includes(btn as IRProtocol)) {
                this.protocol = btn as IRProtocol;
                this.setState({ protocol: this.protocol });
                return;
            }
            // Send the IR signal
            this.transmit(event.address ?? this.address, event.command ?? this.command);
        }

        if (event.type === 'set-address') {
            this.address = parseInt(event.value ?? '0', 10);
            this.setState({
                address: this.address,
                addressHex: this.address.toString(16).toUpperCase().padStart(4, '0'),
            });
        }

        if (event.type === 'set-command') {
            this.command = parseInt(event.value ?? '0', 10);
            this.setState({
                command: this.command,
                commandHex: this.command.toString(16).toUpperCase().padStart(4, '0'),
            });
        }

        if (event.type === 'set-protocol') {
            if (PROTOCOLS.includes(event.value)) {
                this.protocol = event.value as IRProtocol;
                this.setState({ protocol: this.protocol });
            }
        }

        if (event.type === 'set-toggle') {
            this.toggleBit = event.value ? 1 : 0;
        }
    }

    private transmit(address: number, command: number): void {
        this.ensureRegistered();

        const signal = getIRProtocolSignal(this.protocol, address, command, this.toggleBit);

        // Drive the OUT pin with modulated pulse train
        this.active = true;

        // Deliver via IREnvironment
        const deliveredTo = IREnvironment.transmit(this.id, signal);

        this.lastSignalSummary = formatIRValue(this.protocol, address, command);
        this.toggleBit = this.toggleBit ? 0 : 1;

        this.setState({
            active: true,
            lastSignal: this.lastSignalSummary,
            addressHex: address.toString(16).toUpperCase().padStart(4, '0'),
            commandHex: command.toString(16).toUpperCase().padStart(4, '0'),
            receiversInRange: deliveredTo.length,
        });
        
        // Reset the timeout so it stays active
        this.lastTransmissionCycle = (this as any)._runner?.cpu?.core?.cycles || 0;
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        if (pinId !== 'OUT') return;
        const cyclesPerUs = this.getCpuFrequencyHz() / 1000000;
        const durationUs = (cpuCycles - this.lastEdgeCycle) / cyclesPerUs;
        this.lastEdgeCycle = cpuCycles;

        if (durationUs > 100) {
            // Gap > 100us means carrier stopped.
            if (this.isMark) {
                // End of mark
                const markDur = (cpuCycles - this.segmentStartCycle) / cyclesPerUs;
                this.pulses.push({ level: 1, durationUs: markDur });
                this.isMark = false;
                this.segmentStartCycle = cpuCycles;
            }
        } else {
            // Fast toggling
            if (!this.isMark) {
                // Start of mark
                const spaceDur = (cpuCycles - this.segmentStartCycle) / cyclesPerUs;
                if (this.pulses.length > 0) {
                    this.pulses.push({ level: 0, durationUs: spaceDur });
                }
                this.isMark = true;
                this.segmentStartCycle = cpuCycles;
            }
        }
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]): void {
        super.update(cpuCycles, currentWires, allComponentsInstances);

        this.ensureRegistered();

        const posX = (this as any)._posX;
        const posY = (this as any)._posY;
        if (typeof posX === 'number' && typeof posY === 'number') {
            IREnvironment.updatePosition(this.id, posX, posY);
        }

        const powered = this.getPinVoltage('VCC') > 2.5;

        if (!powered) {
            if (this.active) {
                this.active = false;
                this.setState({ active: false });
            }
            return;
        }

        // Query nearby receivers for UI state (throttled to every ~20ms)
        if (cpuCycles - this.lastScanCycle >= 320000) {
            this.lastScanCycle = cpuCycles;
            this.nearbyReceivers = IREnvironment.getReceiversInRange(this.id);
            const node = IREnvironment.getNode(this.id);
            const txPosX = node?.x ?? (this as any)._posX ?? 0;
            const txPosY = node?.y ?? (this as any)._posY ?? 0;
            const prevCount: number = (this.state as any).receiversInRange ?? 0;
            const stateUpdate: any = {
                receiversInRange: this.nearbyReceivers.length,
                txPosX,
                txPosY,
                nearbyReceivers: this.nearbyReceivers.map(r => ({
                    id: r.id,
                    x: r.x,
                    y: r.y,
                    inCone: r.inCone,
                })),
            };
            if (this.nearbyReceivers.length !== prevCount || (this.state as any).txPosX !== txPosX) {
                this.setState(stateUpdate);
            }
        }

        const cyclesPerUs = this.getCpuFrequencyHz() / 1000000;
        const timeSinceEdgeUs = (cpuCycles - this.lastEdgeCycle) / cyclesPerUs;
        
        if (!this.isMark && this.pulses.length > 0 && timeSinceEdgeUs > 15000) {
            // End of transmission!
            const signal = decodeIR(this.pulses);
            if (signal) {
                this.lastSignalSummary = formatIRValue(signal.protocol, signal.address, signal.command);
                this.setState({
                    active: true,
                    lastSignal: this.lastSignalSummary,
                    addressHex: signal.address.toString(16).toUpperCase().padStart(4, '0'),
                    commandHex: signal.command.toString(16).toUpperCase().padStart(4, '0'),
                });
                this.active = true;
                this.lastTransmissionCycle = cpuCycles;
                IREnvironment.transmit(this.id, signal);
            }
            this.pulses = [];
        }

        if (this.active && (cpuCycles - this.lastTransmissionCycle) / cyclesPerUs > 200000) {
            this.active = false;
            this.setState({ active: false });
        }
    }

    onCustomTelemetry(): void {
        this.setCustomTelemetry({
            protocol: this.protocol,
            address: `0x${this.address.toString(16).toUpperCase()}`,
            command: `0x${this.command.toString(16).toUpperCase()}`,
            active: this.active,
            receiversInRange: this.nearbyReceivers.length,
            range: this.range,
            coneAngle: this.coneAngle,
        });
    }
}
