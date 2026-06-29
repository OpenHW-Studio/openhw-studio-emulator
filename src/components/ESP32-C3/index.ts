import { Esp32C3Logic } from './logic.js';
import { Esp32C3UI } from './ui.tsx';
import manifest from './manifest.json';

export default {
    type: manifest.type,
    manifest,
    LogicClass: Esp32C3Logic,
    UI: Esp32C3UI
};
