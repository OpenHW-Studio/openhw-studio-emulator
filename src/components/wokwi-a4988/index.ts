import manifest from './manifest.json';
import { A4988Logic } from './logic';
import { A4988UI, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    Logic: A4988Logic,
    UI: A4988UI,
    BOUNDS,
    validation,
    doc: doc
};

