import { BaseComponent } from '../BaseComponent';

export class Logic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            ...this.state,
            audioChunk: null
        };
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            isPlaying: this.state.audioChunk ? "Yes" : "No"
        });
    }

    /**
     * Tone path (buzzer semantics): a settled audible PWM signal on IN+
     * synthesizes a short sine chunk at the detected frequency, so
     * `tone()` sketches play through the speaker's chunk pipeline exactly
     * like the buzzer — no I2S source required. The UI plays
     * state.audioChunk and shows the playing indicator.
     */
    onPWMSignal(pinId: string, frequencyHz: number, dutyCycle: number, pulseUs: number): void {
        const freq = Number(frequencyHz);
        if (!Number.isFinite(freq) || freq < 20 || freq > 20000) return;
        const duty = Math.min(1, Math.max(0, Number(dutyCycle ?? 0.5) || 0));
        if (duty < 0.01) return;
        const seconds = 0.15;
        const rate = 44100;
        const n = Math.floor(seconds * rate);
        const chunk = new Array(n);
        const amp = 0.4 * duty;
        for (let i = 0; i < n; i += 1) {
            chunk[i] = amp * Math.sin((2 * Math.PI * freq * i) / rate);
        }
        this.state.audioChunk = chunk;
        this.state.frequency = freq;
        this.stateChanged = true;
    }

    onPWM(pinId: string, payload: any): void {
        const duty = payload?.dutyCycle ?? 0;
        const freq = payload?.frequencyHz ?? payload?.frequency ?? 0;
        if (freq) this.onPWMSignal(pinId, freq, duty, 0);
    }

    override update(cycles: number, wires: any[], components: BaseComponent[]): void {
        super.update(cycles, wires, components);

        // Find what's connected to IN+
        const inPinId = `${this.id}:IN+`;
        const connectedNodes = wires
            .filter(w => w.from === inPinId || w.to === inPinId)
            .map(w => w.from === inPinId ? w.to : w.from);

        let audioChunkToPlay = null;

        for (const node of connectedNodes) {
            const [compId] = node.split(':');
            const comp = this.findInstance(components, compId);
            if (comp && comp.state.i2sAudioChunk) {
                // Transfer the audio chunk from the source (e.g. max98357)
                audioChunkToPlay = comp.state.i2sAudioChunk;
                // Clear the source chunk so we don't play it twice
                comp.state.i2sAudioChunk = null;
                break;
            }
        }

        if (audioChunkToPlay) {
            this.state.audioChunk = audioChunkToPlay;
            this.stateChanged = true;
        }
    }

    // 12.4 v2: numeric UI state for SAB slot {f0: volume, i0: playing} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {volume: Number(s.volume ?? 0)},
            i: {playing: (s.playing ? 1 : 0)},
        };
    }
    validate(_component: any, _graph: Map<string, string[]>) {
        return null;
    }
}
