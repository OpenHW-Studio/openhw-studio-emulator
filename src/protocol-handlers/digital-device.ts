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

        const edge = DigitalBusFramer.checkEdge(
            this.pinHistory, this.lastEdgeTimes, pinId, isHigh, cycles,
            this.getDebounceCycles(),
        );
        if (!edge) return; // No change or debounced

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

/**
 * DigitalBusFramer — composition helper for WASM-heavy components (§12.4).
 * Pure debounce + edge detect (no update/WASM knowledge). The static
 * checkEdge() is shared with DigitalProtocol above so JS and WASM paths
 * agree bit-for-bit; the instance wrapper adds rising/falling fan-out. A
 * WASM-heavy digital component extends WasmComponent DIRECTLY, owns a
 * DigitalBusFramer, feeds edges via pushEdge(), and routes via
 * routeDigitalEdge().
 */
export interface DigitalFrameEvents {
    onEdge?(pinId: string, isHigh: boolean, cycles: number): void;
    onRising?(pinId: string, cycles: number): void;
    onFalling?(pinId: string, cycles: number): void;
}

export class DigitalBusFramer {
    private pinHistory: Record<string, boolean> = {};
    private lastEdgeTimes: Record<string, number> = {};
    constructor(
        private readonly debounceCycles: number,
        private readonly events: DigitalFrameEvents,
    ) {}

    /**
     * Shared edge check: returns true when (pinId,isHigh) is a NEW edge
     * outside the debounce window. Histories are caller-owned so both the
     * protocol base and standalone framers run identical logic.
     */
    static checkEdge(
        pinHistory: Record<string, boolean>,
        lastEdgeTimes: Record<string, number>,
        pinId: string, isHigh: boolean, cycles: number,
        debounceCycles: number,
    ): boolean {
        if (pinHistory[pinId] === isHigh) return false; // No change
        const lastEdgeCycle = lastEdgeTimes[pinId] || 0;
        if (debounceCycles > 0 && cycles - lastEdgeCycle < debounceCycles) return false;
        return true;
    }

    /** Feed one edge; returns true when it fires (not debounced). */
    pushEdge(pinId: string, isHigh: boolean, cycles: number): boolean {
        if (!DigitalBusFramer.checkEdge(
            this.pinHistory, this.lastEdgeTimes, pinId, isHigh, cycles,
            this.debounceCycles,
        )) return false;
        this.pinHistory[pinId] = isHigh;
        this.lastEdgeTimes[pinId] = cycles;
        this.events.onEdge?.(pinId, isHigh, cycles);
        if (isHigh) this.events.onRising?.(pinId, cycles);
        else this.events.onFalling?.(pinId, cycles);
        return true;
    }
}
