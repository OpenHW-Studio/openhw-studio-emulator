import { BaseComponent } from '../BaseComponent';

export class SimulationMonitorLogic extends BaseComponent {
    private simStartTime: number = 0;
    private lastSampleTime: number = 0;
    private lastCycles: number = 0;
    private sliceDurations: number[] = [];
    private lastSerializationTimeMs: number = 0.05;
    private lastPayloadBytes: number = 1024;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.simStartTime = performance.now();
        this.lastSampleTime = performance.now();
        this.state = {
            simulationSpeed: 1.0,
            timeDriftMs: 0,
            executionJitterMs: 0,
            frameSkips: 0,
            workerBufferLatency: 0,
            workerCpuLoadPercentage: 0,
            telemetrySerializationTimeMs: 0,
            telemetryPayloadBytes: 0,
            canvasFps: 60,
            uiMainThreadBlockedTimeMs: 0,
            workerMessageQueueLagMs: 0,
            // Phase0 bench counters (§6): runLoop timing mirrors, fed by the
            // runner via updateMetrics extras. Zero = runner predates counters.
            lastRunLoopMs: 0,
            lastPhysicsMs: 0,
            lastComponentUpdateMs: 0
        };
        this.stateChanged = true;
    }

    updateMetrics(cpuCycles: number, targetFreq: number, isTelemetryEnabled: boolean, watchedParams: string[], realCanvasFps: number = 60, realUiBlockedMs: number = 0, runLoopMs: number = 0, physicsMs: number = 0, componentMs: number = 0) {
        const now = performance.now();
        if (this.simStartTime === 0) {
            this.simStartTime = now;
            this.lastSampleTime = now;
            this.lastCycles = cpuCycles;
            return;
        }

        const realDelta = Math.max(0.001, now - this.lastSampleTime);
        const cycleDelta = Math.max(0, cpuCycles - this.lastCycles);

        const watchAll = watchedParams.includes('all');
        const watchSram = this.deepSiliconEnabled && (watchAll || watchedParams.includes('deepSiliconSRAM'));
        const activeParamsCount = watchAll ? 10 : watchedParams.length;

        if (isTelemetryEnabled) {
            this.lastSerializationTimeMs = watchSram ? 8.4 + (activeParamsCount * 0.2) : 0.4 + (activeParamsCount * 0.05);
            this.lastPayloadBytes = watchSram ? 38500 + (activeParamsCount * 500) : 1250 + (activeParamsCount * 120);
        } else {
            this.lastSerializationTimeMs = 0.02;
            this.lastPayloadBytes = 240;
        }

        // 1. simulationSpeed
        const virtualTimeDelta = (cycleDelta / targetFreq) * 1000;
        const speed = Number((virtualTimeDelta / realDelta).toFixed(3));

        // 2. timeDriftMs
        const totalVirtualTimeMs = (cpuCycles / targetFreq) * 1000;
        const totalRealTimeMs = now - this.simStartTime;
        const drift = Number((totalVirtualTimeMs - totalRealTimeMs).toFixed(2));

        // 3. executionJitterMs
        this.sliceDurations.push(realDelta);
        if (this.sliceDurations.length > 30) this.sliceDurations.shift();
        const avgSlice = this.sliceDurations.reduce((a, b) => a + b, 0) / this.sliceDurations.length;
        const jitter = Number(Math.abs(realDelta - avgSlice).toFixed(2));

        // 4. frameSkips
        let skips = this.state?.frameSkips || 0;
        if (realDelta > 25) skips++;

        // 5. workerBufferLatency
        const bufferLatency = Number((this.lastSerializationTimeMs * 1.2).toFixed(2));

        // 6. workerCpuLoadPercentage
        const load = isTelemetryEnabled ? Number(Math.min(98, (this.lastSerializationTimeMs / realDelta) * 100 + 15).toFixed(1)) : Number((2.5).toFixed(1));

        this.lastSampleTime = now;
        this.lastCycles = cpuCycles;

        const nextState = {
            simulationSpeed: Number.isFinite(speed) ? speed : 1.0,
            timeDriftMs: drift,
            executionJitterMs: jitter,
            frameSkips: skips,
            workerBufferLatency: bufferLatency,
            workerCpuLoadPercentage: load,
            telemetrySerializationTimeMs: Number(this.lastSerializationTimeMs.toFixed(3)),
            telemetryPayloadBytes: this.lastPayloadBytes,
            canvasFps: Number(realCanvasFps.toFixed(2)),
            uiMainThreadBlockedTimeMs: realUiBlockedMs,
            workerMessageQueueLagMs: isTelemetryEnabled ? (load > 50 ? 12.4 : 1.5) : 0.2,
            lastRunLoopMs: Number(runLoopMs.toFixed(3)),
            lastPhysicsMs: Number(physicsMs.toFixed(3)),
            lastComponentUpdateMs: Number(componentMs.toFixed(3))
        };

        this.state = nextState;
        this.stateChanged = true;
        return nextState;
    }

    getSyncState() {
        this.stateChanged = true;
        return this.state;
    }

    getTelemetryData() {
        return this.state;
    }

    // 12.4 v2: numeric UI state for SAB slot {f0: workerCpuLoadPercentage} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {workerCpuLoadPercentage: Number(s.workerCpuLoadPercentage ?? 0)},
            i: {},
        };
    }
    validate(component: any, graph: Map<string, string[]>, validator?: any) {
        const hasVcc = component.pins?.VCC?.connected;
        const hasGnd = component.pins?.GND?.connected;
        if (!hasVcc || !hasGnd) {
            return {
                pass: false,
                reasons: [`Simulation Monitor '${component.id}' requires both VCC and GND connections.`]
            };
        }
        return { pass: true };
    }
}
