import { BaseComponent } from '../BaseComponent';

export class PIRLogic extends BaseComponent {
    private motionTimeout: any = null;
    private attrs: any;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        this.attrs = manifest.attrs || {};
        this.state = { motion: false };
    }

    onEvent(event: string) {
        if (event === 'motion_start') {
            this.setState({ motion: true });
            this.setPinVoltage('OUT', 3.3);
            if (this.motionTimeout) {
                clearTimeout(this.motionTimeout);
                this.motionTimeout = null;
            }
        } else if (event === 'motion_stop') {
            this.setState({ motion: false });
            this.setPinVoltage('OUT', 0);
            if (this.motionTimeout) {
                clearTimeout(this.motionTimeout);
                this.motionTimeout = null;
            }
        } else if (event === 'motion') {
            // Traditional PIR trigger logic (hold for delay)
            const delay = this.attrs.delay ? parseInt(this.attrs.delay) : 500;
            this.setState({ motion: true });
            this.setPinVoltage('OUT', 3.3);
            if (this.motionTimeout) clearTimeout(this.motionTimeout);
            this.motionTimeout = setTimeout(() => {
                this.setState({ motion: false });
                this.setPinVoltage('OUT', 0);
                this.motionTimeout = null;
            }, delay);
        }
    }
}
