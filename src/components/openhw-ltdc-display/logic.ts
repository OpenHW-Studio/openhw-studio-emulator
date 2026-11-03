import { BaseComponent } from '../BaseComponent';

// LTDC TFT display sink: the F4 runner pushes decoded RGB frames
// (Display.ltdc() snapshots) here; state carries pixels for UI +
// telemetry proof (litPixels). Same frame contract as NeoPixel
// (onNeoPixelFrame), geometry dynamic per frame.
export class LtdcDisplayLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { fbW: 0, fbH: 0, fb: [], litPixels: 0, ...this.state };
    }

    /** Runner frame push: packed 0xRRGGBB pixels, row-major. */
    onRgbFrame(w: number, h: number, pixels: ArrayLike<number>): void {
        try {
            const W = Math.max(1, Math.floor(Number(w) || 0));
            const H = Math.max(1, Math.floor(Number(h) || 0));
            const n = Math.min(W * H, 64 * 1024);
            const fb: number[] = new Array(n);
            let lit = 0;
            for (let i = 0; i < n; i++) {
                const p = Number((pixels as any)?.[i]) >>> 0;
                fb[i] = p;
                if (p & 0xffffff) lit++;
            }
            this.setState({ fbW: W, fbH: H, fb, litPixels: lit } as any);
        } catch { /* frame never breaks the sim */ }
    }

    // Numeric UI state for SAB slot (via getSyncState snapshot).
    uiState() {
        return {
            f: {},
            i: {
                w: Number((this as any).state?.fbW ?? 0),
                h: Number((this as any).state?.fbH ?? 0),
                lit: Number((this as any).state?.litPixels ?? 0),
            },
        };
    }
}
