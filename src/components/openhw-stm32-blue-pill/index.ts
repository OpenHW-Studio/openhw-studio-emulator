import { validation } from './validation';
import manifest from './manifest.json';
import { BluePillLogic } from './logic';
import { BluePillUI, BOUNDS } from './ui';
import { doc } from './doc';

export default {
    manifest,
    LogicClass: BluePillLogic,
    UI: BluePillUI,
    BOUNDS,
    validation,
    doc: doc
};
