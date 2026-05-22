import { BaseComponent } from '../components/BaseComponent';

export class DigitalProtocol extends BaseComponent {
    private pinHistory: Record<string, boolean> = {};
    private lastEdgeTimes: Record<string, number> = {};

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            ...this.state,
            pinStates: {},
            edgeCount: 0,
            lastEdgePin: null,
            lastEdgeTime: 0,
        };
    }

    getDebounceCycles(): number {
        const ms = Number(this.manifest?.attrs?.debounceMs ?? 0);
        return (ms / 1000) * 16_000_000; // Default to 16MHz base if not sure
    }

    onPinEdge(pinId: string, isHigh: boolean, cycles: number): void {
        // To be overridden
    }

    onRisingEdge(pinId: string, cycles: number): void {
        // To be overridden
    }

    onFallingEdge(pinId: string, cycles: number): void {
        // To be overridden
    }

    onPinStateChange(pinId: string, isHigh: boolean, cycles: number): void {
        super.onPinStateChange(pinId, isHigh, cycles);
        
        const lastState = this.pinHistory[pinId];
        if (lastState === isHigh) return; // No change
        
        const lastEdgeCycle = this.lastEdgeTimes[pinId] || 0;
        const debounce = this.getDebounceCycles();
        
        if (debounce > 0 && cycles - lastEdgeCycle < debounce) {
            return; // Debounced
        }

        this.pinHistory[pinId] = isHigh;
        this.lastEdgeTimes[pinId] = cycles;
        
        this.state.pinStates = { ...this.state.pinStates, [pinId]: isHigh };
        this.state.edgeCount = Number(this.state.edgeCount || 0) + 1;
        this.state.lastEdgePin = pinId;
        this.state.lastEdgeTime = cycles;
        this.stateChanged = true;

        this.onPinEdge(pinId, isHigh, cycles);
        
        if (isHigh) {
            this.onRisingEdge(pinId, cycles);
        } else {
            this.onFallingEdge(pinId, cycles);
        }
    }
}
