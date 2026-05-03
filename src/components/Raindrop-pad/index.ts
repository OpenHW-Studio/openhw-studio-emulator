import manifest from './manifest.json';
import { RaindropPadLogic } from './logic';
import { RaindropPadUI } from './ui';
import { validateRaindropPad } from './validation';
import { BOUNDS } from './constants';

export default {
    manifest,
    UI: RaindropPadUI,
    LogicClass: RaindropPadLogic,
    BOUNDS,
    validation: validateRaindropPad,
};
