import manifest from './manifest.json';
import { Nokia5110Logic } from './logic';
import { Nokia5110UI, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    Logic: Nokia5110Logic,
    UI: Nokia5110UI,
    BOUNDS,
    validation,
    doc: doc
};


