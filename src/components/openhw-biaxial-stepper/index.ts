import manifest from './manifest.json';
import { BiaxialStepperLogic } from './logic';
import { BiaxialStepperUI, BOUNDS } from './ui';
import { validation } from './validation';

// @ts-ignore
const doc = '';

export default {
    manifest,
    LogicClass: BiaxialStepperLogic,
    UI: BiaxialStepperUI,
    doc,
    validation,
    BOUNDS
};
