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
            const comp = components.find(c => c.id === compId);
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
}
