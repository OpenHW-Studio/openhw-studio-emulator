import manifest from './manifest.json';
import { Ks2eLogic } from './logic';
import { Ks2eUI, BOUNDS } from './ui';
import { markdown } from './doc';

export default {
    manifest,
    LogicClass: Ks2eLogic,
    UI: Ks2eUI,
    doc: markdown,
    BOUNDS
};