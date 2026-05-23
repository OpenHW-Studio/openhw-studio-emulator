import manifest from './manifest.json';
import { Lcd1602Logic } from './logic';
import { Lcd1602UI, BOUNDS } from './ui';
import { validation } from './validation';
// @ts-ignore
const doc = '';

export default {
    manifest,
    LogicClass: Lcd1602Logic,
    UI: Lcd1602UI,
    BOUNDS,
    validation,
    doc
};
