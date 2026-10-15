import { BaseComponent } from '../BaseComponent';

// USB device terminal sink: the F4 runner plays USB host (reset +
// enumeration + CDC-ACM echo) against guest USB-device firmware and
// reports link state + echoed bytes here; state carries the proof for
// UI + telemetry (rxCount/lastEcho), serial-independently.
export class UsbDeviceLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { enumState: 'detached', rxCount: 0, lastEcho: '', ...this.state };
    }

    /** Runner host-side report: link state + cumulative echo bytes. */
    onUsbState(enumState: string, rxCount: number, lastEcho: string): void {
        try {
            this.setState({
                enumState: String(enumState || 'detached'),
                rxCount: Math.max(0, Math.floor(Number(rxCount) || 0)),
                lastEcho: String(lastEcho || '').slice(0, 64),
            } as any);
        } catch { /* report never breaks the sim */ }
    }

    // Numeric UI state for SAB slot (via getSyncState snapshot).
    uiState() {
        const st = String((this as any).state?.enumState ?? 'detached');
        const code = st === 'enumerated' ? 3 : st === 'reset' ? 2 : st === 'init' ? 1 : 0;
        return {
            f: {},
            i: {
                st: code,
                rx: Number((this as any).state?.rxCount ?? 0),
            },
        };
    }
}
