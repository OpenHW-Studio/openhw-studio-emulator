import { Esp32C6Logic } from './logic.js';
import { Esp32C6UI } from './ui.tsx';
import manifest from './manifest.json';

export default {
    type: manifest.type,
    manifest,
    LogicClass: Esp32C6Logic,
    UI: Esp32C6UI
};
