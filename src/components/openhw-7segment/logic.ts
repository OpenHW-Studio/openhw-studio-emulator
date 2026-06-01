import { BaseComponent } from '../BaseComponent';

export class Wokwi7SegmentLogic extends BaseComponent {
    private numDigits: number;
    private isAnode: boolean;
    private segmentsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'DP'];

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.numDigits = parseInt(manifest.attrs?.digits || '4', 10);
        this.isAnode = manifest.attrs?.common === 'anode';
        
        this.state = this.getEmptyState();
    }

    private getEmptyState() {
        return {
            digitSegments: Array(this.numDigits).fill(null).map(() => ({
                A: false, B: false, C: false, D: false, E: false, F: false, G: false, DP: false
            })),
            colon: false
        };
    }

    private evaluateCurrentState() {
        for (let i = 0; i < this.numDigits; i++) {
            const digPin = `DIG${i + 1}`;
            const digActive = this.isAnode ? this.getPinVoltage(digPin) > 2.5 : this.getPinVoltage(digPin) < 2.5;

            if (digActive) {
                this.segmentsList.forEach(seg => {
                    const segVoltage = this.getPinVoltage(seg);
                    const segLit = this.isAnode ? segVoltage < 2.5 : segVoltage > 2.5;
                    
                    if (segLit) {
                        this.state.digitSegments[i][seg] = true;
                    }
                });
            }
        }

        const colonVoltage = this.getPinVoltage('COLON');
        const colonLit = this.isAnode ? colonVoltage < 2.5 : colonVoltage > 2.5;
        if (colonLit) {
            this.state.colon = true;
        }
    }

    onPinStateChange(pinId: string, isHigh: boolean, cpuCycles: number) {
        // Accumulate segment states over the 16.6ms simulation frame
        this.evaluateCurrentState();
        this.stateChanged = true;
    }

    getSyncState() {
        // 1. Evaluate current state one last time before syncing (crucial for static states)
        this.evaluateCurrentState();
        
        // 2. Clone current accumulated state to send to UI
        const syncData = JSON.parse(JSON.stringify(this.state));
        
        // Debug log to see if any digit is active
        const isAnyDigitOn = syncData.digitSegments && syncData.digitSegments.some((d: any) => Object.values(d).some(v => v === true));
        if (isAnyDigitOn) {
            console.log('[7SEG DEBUG] SyncData has active segments:', JSON.stringify(syncData.digitSegments));
        }

        // 3. Clear state for the next frame to prevent digits staying "stuck" on
        this.state = this.getEmptyState();
        
        return syncData;
    }

    onCustomTelemetry() {
        let activatedSegments = 0;
        let displayedDigits = 0;
        
        // Count active segments across all digits
        for (let i = 0; i < this.numDigits; i++) {
            const digit = this.state.digitSegments[i];
            let digitActive = false;
            for (const seg of this.segmentsList) {
                if (digit && digit[seg]) {
                    activatedSegments++;
                    digitActive = true;
                }
            }
            if (digitActive) displayedDigits++;
        }
        
        this.setCustomTelemetry({
            displayType: `${this.numDigits}-digit 7-segment ${this.isAnode ? 'common-anode' : 'common-cathode'}`,
            activeSegments: activatedSegments,
            displayedDigits: displayedDigits,
            colonActive: this.state.colon,
            totalDigits: this.numDigits,
        });
    }
}
