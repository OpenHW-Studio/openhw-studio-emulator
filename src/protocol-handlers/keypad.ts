import { BaseComponent } from '../components/BaseComponent';

export class KeypadLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { pressedKey: null, connectedPair: null };
    }
    // Electrical short: when firmware drives the pressed row LOW, pull the
    // pressed column LOW on the AVR pin so matrix scans observe it. The
    // net-level bridge (signal/electrical) is not enough — digitalRead
    // samples the AVR PIN register, which only moves via board-pin drive.
    private refreshColumnDrive() {
        try {
            const pair = (this as any).state?.connectedPair;
            const netOf = (this as any)._boardNetOf;
            const drive = (this as any)._driveBoardPin;
            if (!pair || typeof netOf !== 'function' || typeof drive !== 'function') return;
            const rowBoard = netOf(pair[0]);
            const colBoard = netOf(pair[1]);
            if (!rowBoard || !colBoard) return;
            const rowLow = this.getPinVoltage(pair[0]) < 1.8;
            drive(colBoard, !rowLow);
        } catch { /* drive never breaks sim */ }
    }
    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number): void {
        try {
            const u = String(pinId || '').toUpperCase();
            if (u.startsWith('R')) this.refreshColumnDrive();
        } catch { /* ignore */ }
    }
    onEvent(event: string) {
        if (event.startsWith('press:')) {
            const key = event.split(':')[1];
            const matrix: Record<string, [string, string]> = {
                '1': ['R1', 'C1'], '2': ['R1', 'C2'], '3': ['R1', 'C3'], 'A': ['R1', 'C4'],
                '4': ['R2', 'C1'], '5': ['R2', 'C2'], '6': ['R2', 'C3'], 'B': ['R2', 'C4'],
                '7': ['R3', 'C1'], '8': ['R3', 'C2'], '9': ['R3', 'C3'], 'C': ['R3', 'C4'],
                '*': ['R4', 'C1'], '0': ['R4', 'C2'], '#': ['R4', 'C3'], 'D': ['R4', 'C4']
            };
            this.setState({ pressedKey: key, connectedPair: matrix[key] || null });
            this.refreshColumnDrive();
        } else if (event === 'release') {
            try {
                const pair = (this as any).state?.connectedPair;
                const netOf = (this as any)._boardNetOf;
                const drive = (this as any)._driveBoardPin;
                if (pair && typeof netOf === 'function' && typeof drive === 'function') {
                    const colBoard = netOf(pair[1]);
                    if (colBoard) drive(colBoard, true);
                }
            } catch { /* ignore */ }
            this.setState({ pressedKey: null, connectedPair: null });
        }
    }
}
