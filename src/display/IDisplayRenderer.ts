/**
 * IDisplayRenderer — Generic interface for all OffscreenCanvas display renderers.
 *
 * Each display type (ILI9341, SSD1306, e-paper, HUB75, etc.) implements this interface.
 * Instances live exclusively in the Render Worker — they never touch the main thread.
 */
export interface IDisplayRenderer {
    /** Called once when the OffscreenCanvas is transferred from the main thread. */
    mount(canvas: OffscreenCanvas): void;
    /** Called for every frame from the Simulation Worker. */
    paint(frame: DisplayFrame): void;
    /** Called when the simulation stops or the component is removed. */
    destroy(): void;
}

/**
 * A single display frame payload, sent from the Simulation Worker → Render Worker.
 * The `buffer` field is a Transferable — zero-copy, ownership is handed to the Render Worker.
 */
export interface DisplayFrame {
    compId: string;
    displayType: string;        // 'ili9341' | 'ssd1306' | 'epaper' | 'tft_touch' | ...
    width: number;
    height: number;
    /** Raw RGB (3 bytes/px) or RGBA (4 bytes/px) pixel data. Transferred, not cloned. */
    buffer?: ArrayBuffer | null;
    /** Non-pixel display state (powerOn, reset, vram, displayOn, invert, etc.) */
    state?: Record<string, any>;
    timestamp: number;
}

/**
 * Sent from the main thread → Render Worker to register a canvas for a component.
 * The `canvas` field is a Transferable — ownership is given to the Render Worker permanently.
 */
export interface DisplayMount {
    type: 'DISPLAY_MOUNT';
    compId: string;
    canvas: OffscreenCanvas;
    displayType: string;
    width: number;
    height: number;
}

export interface DisplayUnmount {
    type: 'DISPLAY_UNMOUNT';
    compId: string;
}

export interface DisplayClearAll {
    type: 'DISPLAY_CLEAR_ALL';
}

export interface DisplaySetPort {
    type: 'SET_SIM_PORT';
    port: MessagePort;
}

export type DisplayWorkerMessage =
    | DisplayMount
    | DisplayUnmount
    | DisplayClearAll
    | DisplaySetPort
    | { type: 'DISPLAY_FRAME'; [key: string]: any };
