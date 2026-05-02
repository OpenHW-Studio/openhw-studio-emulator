import { validation } from './validation';
import manifest from './manifest.json';
import { HCSR04Logic } from './logic';
import { HCSR04UI } from './ui';

export const BOUNDS = { x: 0, y: 0, w: 172.5, h: 114 };


export default {
    manifest,
    LogicClass: HCSR04Logic,
    UI: HCSR04UI,
    BOUNDS,
    validation
};
