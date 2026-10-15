import manifest from './manifest.json';
import { LtdcDisplayUI, BOUNDS } from './ui';
import { LtdcDisplayLogic } from './logic';

export default {
    manifest,
    LogicClass: LtdcDisplayLogic,
    UI: LtdcDisplayUI,
    BOUNDS,
};
