import { validation } from './validation';
import manifest from './manifest.json';
import { SoundSensorLogic } from './logic';
import { SoundSensorUI, SoundSensorContextMenu } from './ui';
import { BOUNDS } from './constants';

export default {
    manifest,
    LogicClass: SoundSensorLogic,
    UI: SoundSensorUI,
    ContextMenu: SoundSensorContextMenu,
    BOUNDS,
    validation,
    // CACHE BUSTER: 2026-05-01_v2
};
