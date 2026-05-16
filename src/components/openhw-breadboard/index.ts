import manifest from './manifest.json';
import { BreadboardLogic } from './logic';
import { BreadboardUI, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    Logic: BreadboardLogic,
    UI: BreadboardUI,
    BOUNDS,
    validation,
    doc: doc
};


