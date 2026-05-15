import manifest from './manifest.json';
import { L293DLogic } from './logic';
import { L293DUI, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    Logic: L293DLogic,
    UI: L293DUI,
    BOUNDS,
    validation,
    doc: doc
};


