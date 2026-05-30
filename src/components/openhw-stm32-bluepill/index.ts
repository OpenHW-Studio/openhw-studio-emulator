import manifest from './manifest.json';
import { STM32BluePillLogic } from './logic';
import { STM32BluePillUI, BOUNDS } from './ui';

export default {
    manifest,
    LogicClass: STM32BluePillLogic,
    UI: STM32BluePillUI,
    BOUNDS,
};
