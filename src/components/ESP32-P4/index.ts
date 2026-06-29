import { Esp32P4Logic } from './logic.js';
import { Esp32P4UI } from './ui.tsx';
import manifest from './manifest.json';

export default {
    type: manifest.type,
    manifest,
    LogicClass: Esp32P4Logic,
    UI: Esp32P4UI
};
