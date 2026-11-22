import { BaseComponent } from '../components/BaseComponent';

/**
 * TwoWireProtocol — Abstraction for generic 2-wire serial interfaces (CLK/DIO).
 * This is similar to I2C but lacks addressing and uses LSB-first bit clocking,
 * commonly found in devices like the TM1637.
 *
 * TM1637 WIRING REALITY (why the detector looks the way it does): the runner
 * only forwards pin CHANGES, and on real hardware the master drives DIO
 * while CLK is LOW, then pulses CLK. A DIO change with CLK *currently* HIGH
 * is therefore ambiguous — it is a data setup only when a transaction is
 * already open (after a true START). A genuine START is DIO falling while
 * the bus is IDLE (no transaction open); a genuine STOP is DIO rising back
 * to idle-HIGH *during* an open transaction. Data-bit DIO changes *inside*
 * an open transaction (including the ACK-bit slot) are data, never
 * START/STOP. This matches how the AVR firmware drives the bus and keeps
 * the protocol base and TwoWireBusFramer bit-identical (shared detector).
 */
export interface TwoWireClockState {
    bitCount: number;
    currentByte: number;
}

export class TwoWireProtocol extends BaseComponent implements TwoWireClockState {
    // NOTE: BOTH lines idle HIGH on real TM1637 hardware (open-drain with
    // pull-ups), and the runner only forwards CHANGES — so the reset state
    // must be HIGH/HIGH, otherwise the first real edge is swallowed as a
    // no-op and every subsequent START/STOP inverts. Same for the framer.
    private clkHigh: boolean = true;
    private dioHigh: boolean = true;
    /** Clock state — public only so clockByte() can share it (not API). */
    bitCount: number = 0;
    currentByte: number = 0;
    private inTransaction = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
    }

    onTwoWireStart(): void {}
    
    onTwoWireStop(): void {}
    
    onTwoWireByteReceived(data: number): void {}

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number): void {
        super.onPinStateChange(pinId, isHigh, cpuCycles);

        // Latch previous levels BEFORE updating: the runner delivers pin
        // edges one at a time, and START/STOP vs data-bit depends on what
        // CLK was doing when DIO moved (not after both settled).
        const prevDio = this.dioHigh;
        const prevClk = this.clkHigh;
        if (pinId === 'DIO') this.dioHigh = isHigh;
        else if (pinId === 'CLK') this.clkHigh = isHigh;

        if (pinId === 'DIO') {
            // Shared detector (same rule as the framer): START only when
            // idle, STOP only when open; data setups inside yield null.
            const cond = TwoWireBusFramer.startStop(
                pinId, isHigh, prevClk, prevDio, this.inTransaction);
            if (cond === 'start') {
                this.inTransaction = true;
                this.bitCount = 0;
                this.currentByte = 0;
                this.onTwoWireStart();
            } else if (cond === 'stop') {
                this.inTransaction = false;
                this.onTwoWireStop();
            }
        } else if (pinId === 'CLK' && isHigh && !prevClk && this.inTransaction) {
            // Sample DIO on CLK rising edge (DIO already holds the bit:
            // the master sets DIO while CLK is LOW, then raises CLK).
            const byte = TwoWireBusFramer.clockByte(this, true, this.dioHigh);
            if (byte !== null) this.onTwoWireByteReceived(byte);
        }
    }
}

/**
 * TwoWireBusFramer — composition helper for WASM-heavy components (§12.4).
 * Pure CLK/DIO state machine (no update/WASM knowledge): START/STOP on
 * DIO-while-CLK-HIGH, LSB-first assembly, byte ready on the 9th (ACK)
 * clock. A WASM-heavy TwoWire component extends WasmComponent DIRECTLY,
 * owns a TwoWireBusFramer, feeds pin edges via pushPin(), and routes via
 * routeTwoWire().
 */
export interface TwoWireFrameEvents {
    onStart?(): void;
    onStop?(): void;
    onByte?(data: number): void;
}

export class TwoWireBusFramer implements TwoWireClockState {
    private clkHigh = true;
    private dioHigh = true;
    bitCount = 0;
    currentByte = 0;
    private inTransaction = false;
    constructor(private readonly events: TwoWireFrameEvents) {}

    /**
     * Shared clock step used by BOTH TwoWireProtocol and standalone
     * framers: advances {bitCount, currentByte} on a CLK rising edge and
     * returns the completed byte on the 9th clock, else null.
     */
    static clockByte(
        state: TwoWireClockState,
        clkHigh: boolean, dioHigh: boolean,
    ): number | null {
        if (!clkHigh) return null;
        if (state.bitCount < 8) {
            if (dioHigh) state.currentByte |= (1 << state.bitCount); // LSB first
            state.bitCount++;
            return null;
        }
        if (state.bitCount === 8) {
            const byte = state.currentByte;
            state.bitCount = 0;
            state.currentByte = 0;
            return byte;
        }
        return null;
    }

    /**
     * Shared START/STOP detector. The caller passes PREVIOUS levels plus
     * whether a transaction is open: START = DIO fell while CLK HIGH and
     * the bus was idle; STOP = DIO rose while CLK HIGH and a transaction
     * is open. DIO changes *inside* an open transaction are data setups
     * (including the ACK slot) → null. CLK edges always return null.
     */
    static startStop(
        pinId: string, isHigh: boolean, prevClkHigh: boolean,
        prevDioHigh: boolean, inTransaction: boolean,
    ): 'start' | 'stop' | null {
        if (pinId !== 'DIO' || !prevClkHigh || isHigh === prevDioHigh) return null;
        if (!isHigh && !inTransaction) return 'start';
        if (isHigh && inTransaction) return 'stop';
        return null;
    }

    /** Feed one pin edge (DIO or CLK). */
    pushPin(pinId: string, isHigh: boolean): void {
        const prevDio = this.dioHigh;
        const prevClk = this.clkHigh;
        if (pinId === 'DIO') this.dioHigh = isHigh;
        else if (pinId === 'CLK') this.clkHigh = isHigh;
        if (pinId === 'DIO') {
            const cond = TwoWireBusFramer.startStop(
                pinId, isHigh, prevClk, prevDio, this.inTransaction);
            if (cond === 'start') {
                this.inTransaction = true;
                this.bitCount = 0;
                this.currentByte = 0;
                this.events.onStart?.();
            } else if (cond === 'stop') {
                this.inTransaction = false;
                this.events.onStop?.();
            }
        } else if (pinId === 'CLK' && isHigh && !prevClk && this.inTransaction) {
            const byte = TwoWireBusFramer.clockByte(this, true, this.dioHigh);
            if (byte !== null) this.events.onByte?.(byte);
        }
    }

    get active(): boolean { return this.inTransaction; }
}
