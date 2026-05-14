import { HCSR04Logic } from './logic';
import { HCSR04UI, BOUNDS } from './ui';
import manifest from './manifest.json';
import { doc } from './doc';

export default {
    manifest,
    Logic: HCSR04Logic,
    UI: HCSR04UI,
    BOUNDS,
    doc
};
