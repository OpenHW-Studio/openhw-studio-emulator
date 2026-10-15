import { BaseComponent } from '../BaseComponent';

export class LEDLogic extends BaseComponent {
    voltageDrop = 1.8;
    lastUpdateCycles: number;
    totalCyclesSinceSync: number;
    illuminatedCyclesSinceSync: number;
    hasIlluminatedSinceSync: boolean;

    private _pwmDutyCycle: number = -1;
    private _pwmTimestampCycles: number = -1;
    private _pwmWallMs: number = 0;

    private hasResistorInConnectedPath(currentWires: any[], allComponentsInstances: BaseComponent[]): boolean {
        const startNodes = new Set([`${this.id}:A`, `${this.id}:K`]);
        const visitedNodes = new Set<string>();
        const queue: string[] = Array.from(startNodes);

        while (queue.length > 0) {
            const node = queue.shift()!;
            if (visitedNodes.has(node)) continue;
            visitedNodes.add(node);

            for (const wire of currentWires) {
                if (wire.from === node || wire.to === node) {
                    const nextNode = wire.from === node ? wire.to : wire.from;
                    if (!visitedNodes.has(nextNode)) {
                        queue.push(nextNode);
                    }
                }
            }

            const [compId] = node.split(':');
            const comp = this.findInstance(allComponentsInstances, compId);
            if (comp?.type === 'openhw-resistor' || comp?.type === 'wokwi-resistor') {
                return true;
            }
        }

        return false;
    }

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = {
            illuminated: false,
            brightness: 0,
            color: manifest.attrs?.color || 'red',
            burnedOut: false,
            glow: false,
            vHistory: []
        };
        this.lastUpdateCycles = 0;
        this.totalCyclesSinceSync = 0;
        this.illuminatedCyclesSinceSync = 0;
        this.hasIlluminatedSinceSync = false;
    }

    getConductance() {
        const vA = this.getPinVoltage('A');
        const vK = this.getPinVoltage('K');
        const vDiff = vA - vK;
        if (vDiff >= 1.8) return 0.1;
        if (vDiff >= 1.5) return 0.01;
        if (vDiff <= -5.0) return 0.1;
        return 1e-9;
    }

    onPWM(pinId: string, payload: any): void {
        const dutyCycle = payload?.dutyCycle ?? 0;
        this._pwmDutyCycle = dutyCycle;
        this._pwmWallMs = Date.now(); // event path (not tick) — wall clock OK
        const cycles = this.cyclesNow();
        if (Number.isFinite(Number(cycles))) this._pwmTimestampCycles = Number(cycles);
        const brightness = Math.min(255, Math.max(0, Math.round(dutyCycle * 255)));
        this.setState({
            illuminated: dutyCycle >= 0.01,
            brightness,
            glow: brightness > 50,
        });
    }

    onPWMSignal(pinId: string, frequencyHz: number, dutyCycle: number, pulseUs: number): void {
        this._pwmDutyCycle = dutyCycle;
        this._pwmWallMs = Date.now(); // event path (not tick) — wall clock OK
        const cycles = this.cyclesNow();
        if (Number.isFinite(Number(cycles))) this._pwmTimestampCycles = Number(cycles);
        const brightness = Math.min(255, Math.max(0, Math.round(dutyCycle * 255)));
        this.setState({
            illuminated: dutyCycle >= 0.01,
            brightness,
            glow: brightness > 50,
        });
    }

    /**
     * Runner-agnostic cycle counter (plan §5.3). Prefers the board clock
     * service; falls back to the legacy _simCpu mirror (kept updated in
     * update() for headless harnesses). New code must call this, never
     * _simCpu directly.
     */
    private cyclesNow(): number | undefined {
        try {
            const svc = (this as any)._boardCyclesNow;
            if (typeof svc === 'function') {
                const v = Number(svc());
                if (Number.isFinite(v)) return v;
            }
        } catch { /* fall through */ }
        return (this as any)._simCpu?.cycles;
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        if (this._simCpu == null) this._simCpu = { cycles: cpuCycles } as any;
        else if (typeof this._simCpu === 'object') (this._simCpu as any).cycles = cpuCycles;
        if (this.lastUpdateCycles === 0) {
            this.lastUpdateCycles = cpuCycles;
        }
        const deltaCycles = cpuCycles - this.lastUpdateCycles;
        this.lastUpdateCycles = cpuCycles;

        this.totalCyclesSinceSync += deltaCycles;
        if (this.state.illuminated) {
            this.illuminatedCyclesSinceSync += deltaCycles;
        }

        if (this.state.burnedOut) return;

        const vA = this.getPinVoltage('A');
        const vK = this.getPinVoltage('K');
        const voltageDiff = vA - vK;

        const myPins = [`${this.id}:A`, `${this.id}:K`];
        const isWired = this.state.isWired ?? currentWires.some(w => myPins.includes(w.from) || myPins.includes(w.to));
        const hasResistor = this.state.hasResistor ?? this.hasResistorInConnectedPath(currentWires, allComponentsInstances);

        if (isWired && voltageDiff > 4.0 && !hasResistor) {
            this.setState({ illuminated: false, brightness: 0, burnedOut: true });
            return;
        }

        if (isWired && voltageDiff < -5.0) {
            this.setState({ illuminated: false, brightness: 0, burnedOut: true });
            return;
        }

        // Cycle-based PWM window (16 MHz: 500 ms ≈ 8M cycles). No Date.now in tick.
        const pwmActive = this._pwmTimestampCycles >= 0
            && (this._pwmDutyCycle >= 0 && (cpuCycles - this._pwmTimestampCycles) < 8_000_000);

        if (pwmActive) {
            const brightness = Math.min(255, Math.max(0, Math.round(this._pwmDutyCycle * 255)));
            this.setState({
                illuminated: this._pwmDutyCycle >= 0.01,
                brightness,
                glow: brightness > 50,
            });
        } else if (voltageDiff >= 1.5) {
            const vHistory = [...(this.state.vHistory || []).slice(-19), voltageDiff];
            const current = Math.max(0, voltageDiff - 1.5) / 220;
            const brightnessVal = Math.min(255, Math.round((voltageDiff - 1.5) / 3.5 * 255));
            this.setState({
                illuminated: true,
                brightness: brightnessVal,
                voltageDrop: Math.max(0, Math.min(voltageDiff, this.voltageDrop)),
                current: current,
                glow: current > 0.015,
                vHistory
            });
            this.hasIlluminatedSinceSync = true;
        } else {
            const vHistory = [...(this.state.vHistory || []).slice(-19), voltageDiff > 0 ? voltageDiff : 0];
            this.setState({
                illuminated: false,
                brightness: 0,
                voltageDrop: voltageDiff > 0 ? voltageDiff : 0,
                current: 0,
                glow: false,
                vHistory
            });
        }
    }

    // 12.4 v2: numeric UI state for SAB slot { f0: brightness, i0: illuminated }.
    uiState() {
        return {
            f: { brightness: Number(this.state?.brightness || 0) },
            i: { illuminated: this.state?.illuminated ? 1 : 0 },
        };
    }

    validate(component: any, graph: Map<string, string[]>) {
        const anodeConnected = graph.get(`${component.id}.A`);
        const cathodeConnected = graph.get(`${component.id}.K`);
        if (!anodeConnected || !cathodeConnected) return null;
        if (anodeConnected.length === 0 && cathodeConnected.length === 0) {
            return {
                ruleId: 'led-series-resistor-check',
                severity: 'warn',
                message: `⚠️ [LED ${component.id}] Warning: Neither Anode nor Cathode is connected.`,
                compIds: [component.id],
                remediation: 'Wire the LED into a circuit with a series resistor.',
            };
        }
        return null;
    }

    getSyncState() {
        const state = super.getSyncState() || {};

        const cycles = this.cyclesNow();
        const pwmActive = this._pwmTimestampCycles >= 0 && Number.isFinite(Number(cycles))
            && (this._pwmDutyCycle >= 0 && (Number(cycles) - this._pwmTimestampCycles) < 8_000_000);

        if (pwmActive) {
            state.illuminated = this._pwmDutyCycle >= 0.01;
            state.brightness = Math.min(255, Math.max(0, Math.round(this._pwmDutyCycle * 255)));
            state.glow = state.brightness > 50;
        } else if (this.totalCyclesSinceSync > 0) {
            const dutyCycle = this.illuminatedCyclesSinceSync / this.totalCyclesSinceSync;
            state.illuminated = dutyCycle >= 0.01;
            state.brightness = Math.round(dutyCycle * 255);
            state.glow = state.brightness > 50;
        } else {
            state.illuminated = false;
            state.brightness = 0;
            state.glow = false;
        }

        this.totalCyclesSinceSync = 0;
        this.illuminatedCyclesSinceSync = 0;
        this.hasIlluminatedSinceSync = false;

        return state;
    }

    onCustomTelemetry() {
        let status = 'off';
        if (this.state.burnedOut) status = 'burnedOut';
        else if (this.state.illuminated && this.state.brightness > 200) status = 'fully lit';
        else if (this.state.illuminated) status = 'dim';

        this.setCustomTelemetry({
            status,
            glow: !!this.state.glow,
            color: this.state.color,
            voltageDrop: (this.state.voltageDrop || 0).toFixed(2) + ' V',
            current: ((this.state.current || 0) * 1000).toFixed(2) + ' mA'
        });
    }
}
