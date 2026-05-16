import * as manifest from './manifest.json';
import { WokwiTM1637Logic } from './logic';
import { WokwiTM1637UI, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    Logic: WokwiTM1637Logic,
    UI: WokwiTM1637UI,
    BOUNDS,
    validation,
    doc: doc
};


