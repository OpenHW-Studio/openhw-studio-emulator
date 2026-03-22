import { validation } from './validation';
import manifest from './manifest.json';
import { AnalogJoystickLogic } from './logic';
import { AnalogJoystickUI } from './ui';
import { BOUNDS } from './constants';

export default {
    manifest,
    LogicClass: AnalogJoystickLogic,
    UI: AnalogJoystickUI,
    BOUNDS,
    validation
};
