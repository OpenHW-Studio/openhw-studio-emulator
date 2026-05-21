import { BaseComponent } from '@openhw/emulator';

export class I2SProtocol extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        
        this.state = {
            ...this.state,
            i2sBitsPerFrame: this.getI2SBitsPerFrame(),
            lastLeftSample: 0,
            lastRightSample: 0,
            totalFrameCount: 0,
            peakAmplitude: 0
        };
    }

    getI2SBitsPerFrame(): number {
        return 16;
    }

    getI2SDataPinNames(): string[] {
        return ['DIN', 'DOUT', 'SDATA', 'SD', 'RX', 'TX'];
    }

    onI2SFrame(channel: 0 | 1, sample: number, bitsPerFrame: number): void {
        const normalized = sample / (1 << (bitsPerFrame - 1));
        const absNormalized = Math.abs(normalized);

        if (channel === 0) {
            this.state.lastLeftSample = normalized;
        } else {
            this.state.lastRightSample = normalized;
            this.state.totalFrameCount = Number(this.state.totalFrameCount || 0) + 1;
        }

        if (absNormalized > Number(this.state.peakAmplitude || 0)) {
            this.state.peakAmplitude = absNormalized;
        }

        this.stateChanged = true;
    }

    onI2SWordSelect(channel: 0 | 1): void {
        // Optional override for WS transition edge
    }
}
