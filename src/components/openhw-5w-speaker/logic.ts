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
