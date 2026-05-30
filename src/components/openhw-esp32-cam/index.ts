import manifest from './manifest.json';
import { Esp32CamLogic } from './logic';
import { Esp32CamUI, BOUNDS } from './ui';
import { validation } from './validation';

export default {
    manifest,
    LogicClass: Esp32CamLogic,
    UI: Esp32CamUI,
    BOUNDS,
    validation
};
