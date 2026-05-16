import manifest from './manifest.json';
import { SoilMoistureSensorLogic } from './logic';
import { SoilMoistureSensorUI, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    Logic: SoilMoistureSensorLogic,
    UI: SoilMoistureSensorUI,
    BOUNDS,
    validation,
    doc: doc
};


