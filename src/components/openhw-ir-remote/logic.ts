import { BaseComponent } from '../BaseComponent';
import { IREnvironment } from '../../protocol-handlers/ir-environment';
import { getIRProtocolSignal } from '../../protocol-handlers/ir-protocols';

const NEC_CMD_MAP: Record<string, number> = {
    'Power': 162, 'Menu': 226, 'Test': 34, 'Plus': 2,
    'Back': 194, 'Previous': 224, 'Play': 168, 'Next': 144,
    '0': 104, 'Minus': 152, 'C': 176,
    '1': 48, '2': 24, '3': 122, '4': 16, '5': 56,
    '6': 90, '7': 66, '8': 74, '9': 82,
};

export class IRRemoteLogic extends BaseComponent {
    private transmissionQueue: { cycle: number; voltage: number }[] = [];
    private isTransmitting = false;
    private lastUpdateCycle = 0;
    private registered = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { lastCommand: 'None', wirelessTx: false };
    }

    private ensureRegistered(): void {
        if (this.registered) return;
        this.registered = true;
        IREnvironment.register({
            id: this.id,
            x: (this as any)._posX ?? 0,
            y: (this as any)._posY ?? 0,
            supportedProtocols: ['NEC'],
            coneAngle: 30,
            range: 300,
            onIRSignalReceived: () => false,
        });
    }

    onEvent(event: any) {
        if (event && event.type === 'button_press' && event.button) {
            const cmd = NEC_CMD_MAP[event.button];
            if (cmd !== undefined) {
                this.setState({ lastCommand: event.button });
                this.stateChanged = true;
                this.sendNEC(cmd);
            }
        }
    }

    private sendNEC(command: number) {
        if (this.isTransmitting) return;
        this.isTransmitting = true;
        this.transmissionQueue = [];

        let currentCycles = this.lastUpdateCycle;
        const addPulse = (markUs: number, spaceUs: number) => {
            this.transmissionQueue.push({ cycle: currentCycles, voltage: 0 });
            currentCycles += Math.floor(markUs * 16);
            this.transmissionQueue.push({ cycle: currentCycles, voltage: 5 });
            currentCycles += Math.floor(spaceUs * 16);
        };

        // Leader
        addPulse(9000, 4500);

        const address = 0x00;
        const invAddress = (~address) & 0xFF;
        const invCommand = (~command) & 0xFF;
        const data = (address) | (invAddress << 8) | (command << 16) | (invCommand << 24);

        for (let i = 0; i < 32; i++) {
            const bit = (data >> i) & 1;
            addPulse(562.5, bit ? 1687.5 : 562.5);
        }

        // Stop bit
        addPulse(562.5, 0);
        this.transmissionQueue.push({ cycle: currentCycles, voltage: 5 });

        // ── Wireless broadcast via IREnvironment ──
        this.ensureRegistered();
        const signal = getIRProtocolSignal('NEC', address, command);
        IREnvironment.transmit(this.id, signal);
        this.setState({ wirelessTx: true });
    }

    update(cpuCycles: number, wires: any[], instances: BaseComponent[]) {
        super.update(cpuCycles, wires, instances);
        this.lastUpdateCycle = cpuCycles;

        this.ensureRegistered();

        const posX = (this as any)._posX;
        const posY = (this as any)._posY;
        if (typeof posX === 'number' && typeof posY === 'number') {
            IREnvironment.updatePosition(this.id, posX, posY);
        }

        if (!this.isTransmitting && this.transmissionQueue.length === 0) {
            this.setPinVoltage('DAT', 5);
            if ((this.state as any).wirelessTx) {
                this.setState({ wirelessTx: false });
            }
            return;
        }

        while (this.transmissionQueue.length > 0 && cpuCycles >= this.transmissionQueue[0].cycle) {
            const nextEvent = this.transmissionQueue.shift();
            if (nextEvent) {
                this.setPinVoltage('DAT', nextEvent.voltage);
            }
        }

        if (this.transmissionQueue.length === 0) {
            this.isTransmitting = false;
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            lastCommand: this.state.lastCommand,
            isTransmitting: this.isTransmitting,
            wirelessTx: (this.state as any).wirelessTx,
        });
    }
}
