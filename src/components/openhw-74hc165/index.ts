import { HC165Logic } from './logic';
import { HC165UI, BOUNDS } from './ui';
import manifest from './manifest.json';
import { doc } from './doc';
import { validation } from './validation';

export default {
    manifest,
    UI: HC165UI,
    LogicClass: HC165Logic,
    BOUNDS,
    doc,
    validation
};
