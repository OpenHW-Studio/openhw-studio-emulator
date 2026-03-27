import { validation } from './validation';
import manifest from './manifest.json';
import { SoilMoistureSensorLogic } from './logic';
import { SoilMoistureSensorUI } from './ui';
import { BOUNDS } from './constants';

export default {
    manifest,
    LogicClass: SoilMoistureSensorLogic,
    UI: SoilMoistureSensorUI,
    BOUNDS,
    validation
};
