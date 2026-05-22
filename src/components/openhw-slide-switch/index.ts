import { validation } from './validation';
import manifest from './manifest.json';
import { SlideSwitchLogic } from './logic';
import { SlideSwitchUI, BOUNDS } from './ui';
import { doc } from './doc';

export default {
    manifest,
    LogicClass: SlideSwitchLogic,
    UI: SlideSwitchUI,
    BOUNDS,
    validation,
    doc
};
