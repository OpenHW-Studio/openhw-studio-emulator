import * as manifest from './manifest.json';
import { NeopixelRingLogic } from './logic';
import { NeopixelRingUI, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    Logic: NeopixelRingLogic,
    UI: NeopixelRingUI,
    BOUNDS,
    validation,
    doc: doc
};

