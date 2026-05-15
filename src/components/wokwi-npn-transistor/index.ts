import manifest from './manifest.json';
import { NPNTransistorLogic } from './logic';
import { NPNTransistorUI, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    Logic: NPNTransistorLogic,
    UI: NPNTransistorUI,
    BOUNDS,
    validation,
    doc: doc
};


