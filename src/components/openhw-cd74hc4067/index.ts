import manifest from './manifest.json';
import { CD74HC4067Logic } from './logic';
import { CD74HC4067UI, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    Logic: CD74HC4067Logic,
    UI: CD74HC4067UI,
    BOUNDS,
    validation,
    doc: doc
};

