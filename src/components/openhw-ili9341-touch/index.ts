import manifest from './manifest.json';
import { ILI9341TouchUI, BOUNDS } from './ui';
import { ILI9341TouchLogic } from './logic';

import { validation } from './validation';
// @ts-ignore
const doc = '';

export default { manifest, UI: ILI9341TouchUI, BOUNDS, LogicClass: ILI9341TouchLogic, validation, doc };
