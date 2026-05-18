import { validation } from './validation';
import manifest from './manifest.json';
import { SimulationMonitorLogic } from './logic';
import { SimulationMonitorUI, BOUNDS } from './ui';
import { doc } from './doc';

export default {
    manifest,
    LogicClass: SimulationMonitorLogic,
    UI: SimulationMonitorUI,
    BOUNDS,
    validation,
    doc
};
