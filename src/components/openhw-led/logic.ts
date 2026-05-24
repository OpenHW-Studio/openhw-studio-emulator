import { BaseComponent } from '../BaseComponent';

export class LEDLogic extends BaseComponent {
    voltageDrop = 1.8;

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
            const comp = allComponentsInstances.find((c) => c.id === compId);
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
        if (vDiff >= 1.8) return 0.1; // Conducting (10 ohms equivalent)
        if (vDiff >= 1.5) return 0.01; // Starting to conduct
        if (vDiff <= -5.0) return 0.1; // Reverse breakdown conduction
        return 1e-9; // Non-conducting
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        if (this.lastUpdateCycles === 0) this.lastUpdateCycles = cpuCycles;
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

        // Forward burnout (Over-current)
        if (isWired && voltageDiff > 4.0 && !hasResistor) {
            this.setState({ illuminated: false, brightness: 0, burnedOut: true });
            return;
        }

        // Reverse burnout (Breakdown)
        if (isWired && voltageDiff < -5.0) {
            this.setState({ illuminated: false, brightness: 0, burnedOut: true });
            return;
        }

        const vDropActual = Math.max(0, Math.min(voltageDiff, this.voltageDrop));
        
        // Simple current estimation: If we have a resistor in the path, 
        // the current is (TotalV - Vdrop) / R. 
        // We'll show the voltage drop across the LED specifically.
        if (voltageDiff >= 1.5) {
            const vHistory = [...(this.state.vHistory || []).slice(-19), voltageDiff];
            const current = Math.max(0, voltageDiff - 1.5) / 220;
            this.setState({ 
                illuminated: true, 
                brightness: 255,
                voltageDrop: vDropActual,
                current: current,
                glow: current > 0.015, // Glow if > 15mA
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

    getSyncState() {
        const state = super.getSyncState() || {};
        const res = { ...state };
        
        if (this.totalCyclesSinceSync > 0) {
            const dutyCycle = this.illuminatedCyclesSinceSync / this.totalCyclesSinceSync;
            if (dutyCycle > 0.01 && dutyCycle < 0.99) {
                // PWM Intensity Averaging
                res.illuminated = true;
                res.brightness = Math.round(dutyCycle * 255);
                res.glow = res.brightness > 50;
            } else if (dutyCycle <= 0.01 && this.hasIlluminatedSinceSync) {
                // Pulse Stretching for split-second blinks
                res.illuminated = true;
                res.brightness = 255;
                res.glow = true;
            }
        } else if (this.hasIlluminatedSinceSync) {
            res.illuminated = true;
            res.brightness = 255;
            res.glow = true;
        }

        this.totalCyclesSinceSync = 0;
        this.illuminatedCyclesSinceSync = 0;
        this.hasIlluminatedSinceSync = false;
        
        return res;
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
