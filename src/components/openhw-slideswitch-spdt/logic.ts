import { BaseComponent } from '../BaseComponent';

export class SlideswitchSpdtLogic extends BaseComponent {
    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.state = { position: 'left' }; // 'left' or 'right'
    }

    getMnaStamps() {
        const leftConductance = this.state.position === 'left' ? 1000 : 1e-9;
        const rightConductance = this.state.position === 'right' ? 1000 : 1e-9;
        return [
            { pins: ['1', 'COM'], g: leftConductance },
            { pins: ['2', 'COM'], g: rightConductance }
        ];
    }

    onEvent(event: string) {
        if (event === 'toggle' || event === 'slide') {
            const nextPos = this.state.position === 'left' ? 'right' : 'left';
            this.setState({ position: nextPos });
            this.stateChanged = true;
        } else if (event === 'set:left') {
            this.setState({ position: 'left' });
            this.stateChanged = true;
        } else if (event === 'set:right') {
            this.setState({ position: 'right' });
            this.stateChanged = true;
        }
    }

    onCustomTelemetry() {
        this.setCustomTelemetry({
            position: this.state.position,
            connectedTo: this.state.position === 'left' ? 'Pin 1' : 'Pin 2',
        });
    }
}
