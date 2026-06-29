import { Esp32S31Logic } from './logic.js';
import { Esp32S31UI } from './ui.tsx';
import manifest from './manifest.json';

export default {
    type: manifest.type,
    manifest,
    LogicClass: Esp32S31Logic,
    UI: Esp32S31UI
};
