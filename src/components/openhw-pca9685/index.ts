import manifest from './manifest.json';
import { PCA9685Logic } from './logic';
import { PCA9685UI, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    Logic: PCA9685Logic,
    UI: PCA9685UI,
    BOUNDS,
    validation,
    doc: doc
};


