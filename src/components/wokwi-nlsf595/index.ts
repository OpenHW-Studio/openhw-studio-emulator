import manifest from './manifest.json';
import { NLSF595Logic } from './logic';
import { NLSF595UI, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    Logic: NLSF595Logic,
    UI: NLSF595UI,
    BOUNDS,
    validation,
    doc: doc
};


