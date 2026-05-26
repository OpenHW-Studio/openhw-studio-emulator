import manifest from './manifest.json';
import { OLEDDisplayUI, BOUNDS } from './ui';
import { OLEDDisplayLogic } from './logic';
import { validation } from './validation';
import { doc } from './doc';

export default { manifest, UI: OLEDDisplayUI, BOUNDS, LogicClass: OLEDDisplayLogic, validation, doc: doc };
