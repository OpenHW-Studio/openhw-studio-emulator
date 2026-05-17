import * as manifest from './manifest.json';
import { OpenhwTM1637Logic } from './logic';
import { OpenhwTM1637UI } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    Logic: OpenhwTM1637Logic,
    UI: OpenhwTM1637UI,
    validation,
    doc: doc
};

