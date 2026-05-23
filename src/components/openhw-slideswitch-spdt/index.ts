import { validation } from './validation';
import manifest from './manifest.json';
import { SlideswitchSpdtLogic } from './logic';
import { SlideswitchSpdtUI, BOUNDS } from './ui';
import { doc } from './doc';

export default {
    manifest,
    LogicClass: SlideswitchSpdtLogic,
    UI: SlideswitchSpdtUI,
    BOUNDS,
    validation,
    doc: doc
};
export { SlideswitchSpdtLogic };
