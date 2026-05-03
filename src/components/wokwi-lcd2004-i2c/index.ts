import manifest from './manifest.json';
import { Lcd2004I2CUI } from './ui';
import { Lcd2004I2CLogic } from './logic';
import { validation } from './validation';
import { doc } from './doc';

export const BOUNDS = { x: 0, y: 0, w: 370, h: 180 };

export default {
    manifest,
    UI: Lcd2004I2CUI,
    LogicClass: Lcd2004I2CLogic,
    BOUNDS,
    validation,
    doc: doc
};