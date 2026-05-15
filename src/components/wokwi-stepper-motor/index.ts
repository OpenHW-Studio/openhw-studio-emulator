import manifest from './manifest.json';
import { StepperMotorLogic } from './logic';
import { StepperMotorUI, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    Logic: StepperMotorLogic,
    UI: StepperMotorUI,
    BOUNDS,
    validation,
    doc: doc
};


