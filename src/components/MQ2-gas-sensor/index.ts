import { validation } from './validation';
import manifest from './manifest.json';
import { GasSensorLogic } from './logic';
import { GasSensorUI, GasContextMenu } from './ui';
import { BOUNDS } from './constants';

export default {
    manifest,
    LogicClass: GasSensorLogic,
    UI: GasSensorUI,
    ContextMenu: GasContextMenu,
    BOUNDS,
    validation
};
