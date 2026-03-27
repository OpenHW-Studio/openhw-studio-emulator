import { validation } from './validation';
import manifest from './manifest.json';
import { MembraneKeypadLogic } from './logic';
import { MembraneKeypadUI, MembraneKeypadContextMenu } from './ui';

export const BOUNDS = { x: 0, y: 0, w: manifest.width, h: manifest.height };

export default {
    manifest,
    LogicClass: MembraneKeypadLogic,
    UI: MembraneKeypadUI,
    ContextMenu: MembraneKeypadContextMenu,
    contextMenuDuringRun: false,
    BOUNDS,
    validation,
};