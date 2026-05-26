import { BaseComponent } from '../BaseComponent';

export class Ks2eLogic extends BaseComponent {
    private energised: boolean = false;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { energised: false };
    }

    getMnaPins() {
        return ['COIL1', 'COIL2', 'P1', 'NC1', 'NO1', 'P2', 'NC2', 'NO2'];
    }

    getMnaStamps() {
        const shortCond = 1000;   // 0.001 ohm = conducting
        const openCond = 1e-12;   // 1 teraohm = open circuit
        const coilCond = 1 / 150; // 150 ohm coil

        const stamps: any[] = [
            // Coil resistance (always present)
            { pins: ['COIL1', 'COIL2'], g: coilCond },
        ];

        // Pole 1: P1 switches between NC1 and NO1
        if (this.energised) {
            // Energised: P1 connects to NO1 (Normally Open)
            stamps.push({ pins: ['P1', 'NO1'], g: shortCond });
            stamps.push({ pins: ['P1', 'NC1'], g: openCond });
        } else {
            // Unenergised: P1 connects to NC1 (Normally Closed)
            stamps.push({ pins: ['P1', 'NC1'], g: shortCond });
            stamps.push({ pins: ['P1', 'NO1'], g: openCond });
        }

        // Pole 2: P2 switches between NC2 and NO2
        if (this.energised) {
            // Energised: P2 connects to NO2 (Normally Open)
            stamps.push({ pins: ['P2', 'NO2'], g: shortCond });
            stamps.push({ pins: ['P2', 'NC2'], g: openCond });
        } else {
            // Unenergised: P2 connects to NC2 (Normally Closed)
            stamps.push({ pins: ['P2', 'NC2'], g: shortCond });
            stamps.push({ pins: ['P2', 'NO2'], g: openCond });
        }

        return stamps;
    }

    update(cpuCycles: number, currentWires: any[], allComponentsInstances: BaseComponent[]) {
        // Read the voltages at the coil pins from the pins object
        const v1 = this.pins['COIL1']?.voltage ?? 0;
        const v2 = this.pins['COIL2']?.voltage ?? 0;

        // Calculate voltage difference
        const voltageDifference = Math.abs(v1 - v2);

        // Relay energises when voltage difference exceeds ~3.5V
        const newEnergised = voltageDifference > 3.5;

        // If state changed, update and signal the engine
        if (newEnergised !== this.energised) {
            this.energised = newEnergised;

            // Update state - this also sets stateChanged = true internally
            this.setState({ energised: this.energised });
        }
    }

    getSyncState() {
        return {
            ...this.state,
            energised: this.energised
        };
    }
}