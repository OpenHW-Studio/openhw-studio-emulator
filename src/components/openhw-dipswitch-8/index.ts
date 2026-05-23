import { validation } from './validation';
import manifest from './manifest.json';
import { Dipswitch8Logic } from './logic';
import { Dipswitch8UI, BOUNDS } from './ui';
import { doc } from './doc';

export default {
    manifest,
    LogicClass: Dipswitch8Logic,
    UI: Dipswitch8UI,
    BOUNDS,
    validation,
    doc: doc
};
export { Dipswitch8Logic };
