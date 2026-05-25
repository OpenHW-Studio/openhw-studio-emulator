import manifest from './manifest.json';
import { Esp32Logic } from './logic';
import { Esp32UI, BOUNDS } from './ui';

export default {
    manifest,
    LogicClass: Esp32Logic,
    UI: Esp32UI,
    BOUNDS
};
