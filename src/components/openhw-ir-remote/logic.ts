import { BaseComponent } from '../BaseComponent';

const NEC_CMD_MAP: Record<string, number> = {
    'Power': 162,
    'Menu': 226,
    'Test': 34,
    'Plus': 2,
    'Back': 194,
    'Previous': 224,
    'Play': 168,
    'Next': 144,
    '0': 104,
    'Minus': 152,
    'C': 176,
    '1': 48,
    '2': 24,
    '3': 122,
    '4': 16,
    '5': 56,
    '6': 90,
    '7': 66,
    '8': 74,
    '9': 82
};

export class IRRemoteLogic extends BaseComponent {
    private transmissionQueue: { cycle: number, voltage: number }[] = [];
    private isTransmitting = false;
    private lastUpdateCycle = 0;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { lastCommand: 'None' };
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

        // Note: Standard IR receivers output ACTIVE LOW (Idle High)
        // Mark = 0V, Space = 5V

        let currentCycles = this.lastUpdateCycle;
        const addPulse = (markUs: number, spaceUs: number) => {
            // Mark (Active Low on receiver)
            this.transmissionQueue.push({ cycle: currentCycles, voltage: 0 });
            currentCycles += Math.floor(markUs * 16);
            
            // Space (Idle High on receiver)
            this.transmissionQueue.push({ cycle: currentCycles, voltage: 5 });
            currentCycles += Math.floor(spaceUs * 16);
        };

        // Leader code: 9ms Mark, 4.5ms Space
        addPulse(9000, 4500);

        const address = 0x00;
        const invAddress = (~address) & 0xFF;
        const invCommand = (~command) & 0xFF;

        const data = (address) | (invAddress << 8) | (command << 16) | (invCommand << 24);

        // 32 bits of data. LSB first
        for (let i = 0; i < 32; i++) {
            const bit = (data >> i) & 1;
            if (bit) {
                addPulse(562.5, 1687.5);
            } else {
                addPulse(562.5, 562.5);
            }
        }

        // Stop bit
        addPulse(562.5, 0); // Mark then stay idle (5V)
        this.transmissionQueue.push({ cycle: currentCycles, voltage: 5 });
    }

    update(cpuCycles: number, wires: any[], instances: BaseComponent[]) {
        super.update(cpuCycles, wires, instances);
        this.lastUpdateCycle = cpuCycles;

        if (!this.isTransmitting && this.transmissionQueue.length === 0) {
            this.setPinVoltage('DAT', 5); // Default idle state for IR receivers is HIGH
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
            isTransmitting: this.isTransmitting
        });
    }
}
