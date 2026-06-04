/**
 * ProtocolAnalyzer
 *
 * Translates raw emulator bus events into structured, human-readable log entries.
 * Covers all protocols supported by the OpenHW simulator:
 *   GPIO, PWM, LEDC, DAC, ADC, TONE, Serial TX/RX, I2C, SPI,
 *   TWAI/CAN, RMT/IR, PCNT, WS2812/NeoPixel, Deep Sleep, Wake.
 *
 * Usage:
 *   const pa = new ProtocolAnalyzer();
 *   pa.processI2C({ address: 0x3C, data: [0x00, 0xFF], isWrite: true });
 *   pa.getLogs('I2C');   // → filtered log array
 *   pa.getStats();       // → per-protocol counts + last timestamps
 *   pa.exportCSV();      // → CSV string for download/debugging
 */

export class ProtocolAnalyzer {
    constructor() {
        /** @type {Array<{type:string, time:number, message:string, raw?:any}>} */
        this.logs = [];

        /** @type {Map<string, {count:number, lastTime:number}>} */
        this._stats = new Map();
    }

    // ── Internal helpers ───────────────────────────────────────────────────────

    _record(type, message, raw) {
        const entry = { type, time: Date.now(), message, raw };
        this.logs.push(entry);
        const s = this._stats.get(type) || { count: 0, lastTime: 0 };
        s.count++;
        s.lastTime = entry.time;
        this._stats.set(type, s);
        return entry;
    }

    _hex(bytes) {
        if (!Array.isArray(bytes)) return '—';
        return bytes.map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    }

    _v(voltage) {
        return typeof voltage === 'number' ? voltage.toFixed(3) + 'V' : '—';
    }

    // ── I2C ───────────────────────────────────────────────────────────────────

    processI2C(event) {
        const { address, data, hex, direction, isWrite } = event;
        const mode = (isWrite || direction === 'write') ? 'WRITE' : 'READ';
        const hexData = hex
            ? '0x' + hex
            : (Array.isArray(data)
                ? this._hex(data)
                : '0x' + (data || 0).toString(16).toUpperCase());
        return this._record('I2C',
            `[I2C] Addr: 0x${(address || 0).toString(16).toUpperCase().padStart(2, '0')} | ${mode} | Data: ${hexData}`,
            event);
    }

    // ── SPI ───────────────────────────────────────────────────────────────────

    processSPI(event) {
        const { data, hex } = event;
        const hexData = hex
            ? '0x' + hex
            : (Array.isArray(data) ? this._hex(data) : '0x' + (data || 0).toString(16).toUpperCase());
        return this._record('SPI', `[SPI] Data: ${hexData}`, event);
    }

    // ── GPIO ──────────────────────────────────────────────────────────────────

    processGpio(event) {
        const { pin, value, boardId } = event;
        const state = value ? 'HIGH' : 'LOW';
        const board = boardId ? ` (${boardId})` : '';
        return this._record('GPIO', `[GPIO] Pin ${pin}: ${state}${board}`, event);
    }

    // ── PWM (analogWrite) ─────────────────────────────────────────────────────

    processPwm(event) {
        const { pin, duty_pct, val } = event;
        const pct = typeof duty_pct === 'number'
            ? (duty_pct * 100).toFixed(1)
            : (typeof val === 'number' ? ((val / 255) * 100).toFixed(1) : '?');
        return this._record('PWM', `[PWM] Pin ${pin}: ${pct}% duty`, event);
    }

    // ── LEDC PWM ──────────────────────────────────────────────────────────────

    processLedc(event) {
        const { channel, duty, duty_pct, pin } = event;
        const pct = typeof duty_pct === 'number' ? (duty_pct * 100).toFixed(1) : '?';
        const pinStr = pin !== undefined ? ` → GPIO${pin}` : '';
        return this._record('LEDC', `[LEDC] Ch${channel}${pinStr}: ${pct}% (duty=${duty ?? '?'})`, event);
    }

    // ── DAC ───────────────────────────────────────────────────────────────────

    processDac(event) {
        const { pin, val, voltage } = event;
        return this._record('DAC',
            `[DAC] Pin ${pin}: ${val ?? '?'}/255 (${this._v(voltage)})`,
            event);
    }

    // ── ADC (analogRead) ──────────────────────────────────────────────────────

    processAdc(event) {
        const { channel, val, voltage } = event;
        const voltStr = voltage !== undefined ? ` (${this._v(voltage)})` : '';
        return this._record('ADC', `[ADC] Ch${channel}: ${val ?? '?'}/4095${voltStr}`, event);
    }

    // ── TONE (buzzer/speaker) ─────────────────────────────────────────────────

    processTone(event) {
        const { pin, frequency, duration } = event;
        if (!frequency) {
            return this._record('TONE', `[TONE] Pin ${pin}: STOP`, event);
        }
        const durStr = duration ? ` for ${duration}ms` : '';
        return this._record('TONE', `[TONE] Pin ${pin}: ${frequency}Hz${durStr}`, event);
    }

    // ── Serial TX (firmware → monitor) ───────────────────────────────────────

    processSerial(event) {
        const { text, data, source } = event;
        const line = text ?? data ?? '';
        const src = source ? ` [${source}]` : '';
        return this._record('SERIAL', `[UART TX]${src} "${line}"`, event);
    }

    // ── Serial RX (component → firmware) ─────────────────────────────────────

    processSerialRx(event) {
        const { channel, data } = event;
        return this._record('SERIAL_RX',
            `[UART RX] Ch${channel ?? 0} ← "${data ?? ''}"`,
            event);
    }

    // ── TWAI / CAN Bus ────────────────────────────────────────────────────────

    processTwai(event) {
        const { id, dlc, data } = event;
        const idHex = '0x' + (id ?? 0).toString(16).toUpperCase().padStart(3, '0');
        const bytes = Array.isArray(data) ? this._hex(data) : '—';
        return this._record('TWAI', `[TWAI/CAN] ID:${idHex} DLC:${dlc ?? '?'} [${bytes}]`, event);
    }

    // ── RMT / IR pulses ───────────────────────────────────────────────────────

    processRmt(event) {
        const { channel, pulses } = event;
        const count = Array.isArray(pulses) ? pulses.length : '?';
        const proto = Array.isArray(pulses) && pulses.length === 64 ? ' (NEC?)' :
                      Array.isArray(pulses) && pulses.length === 34 ? ' (RC-5?)' : '';
        return this._record('RMT', `[RMT] Ch${channel}: ${count} pulses${proto}`, event);
    }

    // ── PCNT (pulse counter) ──────────────────────────────────────────────────

    processPcnt(event) {
        const { unit, count } = event;
        return this._record('PCNT', `[PCNT] Unit${unit}: ${count ?? '?'} counts`, event);
    }

    // ── WS2812 / NeoPixel ─────────────────────────────────────────────────────

    processNeopixel(event) {
        const { channel, pixels } = event;
        const count = Array.isArray(pixels) ? pixels.length : '?';
        const sample = Array.isArray(pixels) && pixels.length > 0
            ? ` first=[r:${pixels[0].r},g:${pixels[0].g},b:${pixels[0].b}]`
            : '';
        return this._record('NEOPIXEL', `[WS2812] Ch${channel ?? 0}: ${count} pixels${sample}`, event);
    }

    // ── Deep Sleep & Wake ─────────────────────────────────────────────────────

    processSleep(event) {
        const { duration_us } = event;
        const sec = duration_us ? (duration_us / 1_000_000).toFixed(3) + 's' : '∞';
        return this._record('SLEEP', `[SLEEP] Deep sleep: ${sec} (${duration_us ?? 0}µs)`, event);
    }

    processWake(event) {
        return this._record('WAKE', '[WAKE] Resumed from deep sleep', event);
    }

    // ── I2S Audio ─────────────────────────────────────────────────────────────

    /**
     * Log an I2S_AUDIO event (PCM data from sim_i2s_write).
     * Reports port, sample rate, bit depth, and number of samples.
     * Actual audio playback happens in SimulatorPage.jsx via Web Audio API.
     */
    processI2S(event) {
        const { port, sampleRate, bits, pcm_b64 } = event;
        // Estimate sample count from base64 length
        const rawBytes = pcm_b64 ? Math.floor(pcm_b64.length * 3 / 4) : 0;
        const bytesPerSample = bits === 32 ? 4 : (bits === 24 ? 3 : 2);
        const sampleCount = bytesPerSample > 0 ? Math.floor(rawBytes / bytesPerSample) : 0;
        const durationMs = sampleRate > 0 ? ((sampleCount / sampleRate) * 1000).toFixed(1) : '?';
        return this._record('I2S',
            `[I2S] Port${port ?? 0}: ${sampleCount} samples @ ${sampleRate ?? '?'}Hz ${bits ?? 16}bit (~${durationMs}ms)`,
            event);
    }


    /**
     * Return all logs, optionally filtered by protocol type (case-insensitive).
     * @param {string|null} filter  e.g. 'I2C', 'TWAI', 'LEDC', 'SERIAL'
     */
    getLogs(filter = null) {
        if (!filter) return this.logs;
        const key = filter.toUpperCase();
        return this.logs.filter(l => l.type === key);
    }

    /**
     * Return per-protocol stats: { I2C: { count, lastTime }, SPI: { ... }, ... }
     */
    getStats() {
        const out = {};
        for (const [k, v] of this._stats.entries()) {
            out[k] = { ...v };
        }
        return out;
    }

    /**
     * Export all logs as a CSV string (Timestamp ISO, Type, Message).
     */
    exportCSV() {
        const header = 'Timestamp,Type,Message\n';
        const rows = this.logs.map(l => {
            const ts = new Date(l.time).toISOString();
            const msg = `"${l.message.replace(/"/g, '""')}"`;
            return `${ts},${l.type},${msg}`;
        });
        return header + rows.join('\n');
    }

    /** Clear all logs and reset stats */
    clear() {
        this.logs = [];
        this._stats.clear();
    }
}
