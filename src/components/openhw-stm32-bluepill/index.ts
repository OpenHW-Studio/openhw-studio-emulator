import manifest from './manifest.json';
import { STM32BluePillUI, BOUNDS } from './ui';
import { STM32BluePillLogic } from './logic';

export default {
    manifest,
    UI: STM32BluePillUI,
    LogicClass: STM32BluePillLogic,
    BOUNDS
};
