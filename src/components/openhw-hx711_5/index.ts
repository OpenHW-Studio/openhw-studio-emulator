import { validation } from './validation';
import manifest from './manifest.json';
import { HX711Logic } from './logic';
import { HX711UI, BOUNDS } from './ui';
import { doc } from './doc';

export default {
    manifest,
    LogicClass: HX711Logic,
    UI: HX711UI,
    BOUNDS,
    validation,
    doc
};
