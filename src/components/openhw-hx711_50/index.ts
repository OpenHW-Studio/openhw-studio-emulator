import { validation } from './validation';
import manifest from './manifest.json';
import { HX711Logic_50 } from './logic';
import { HX711UI_50, BOUNDS } from './ui';
import { doc } from './doc';

export default {
    manifest,
    LogicClass: HX711Logic_50,
    UI: HX711UI_50,
    BOUNDS,
    validation,
    doc
};
