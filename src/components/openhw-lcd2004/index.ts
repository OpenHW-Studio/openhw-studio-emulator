import manifest from './manifest.json';
import { Lcd2004Logic } from './logic';
import { Lcd2004UI, BOUNDS } from './ui';
import { validation } from './validation';

// @ts-ignore
const doc = '';

export default {
    manifest,
    LogicClass: Lcd2004Logic,
    UI: Lcd2004UI,
    BOUNDS,
    validation,
    doc
};
