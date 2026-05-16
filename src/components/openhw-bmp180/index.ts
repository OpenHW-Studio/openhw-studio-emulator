import { validation } from './validation';
import manifest from './manifest.json';
import { BMP180Logic } from './logic';
import { BMP180UI, BMP180ContextMenu, BOUNDS } from './ui';

export default {
    manifest,
    LogicClass: BMP180Logic,
    UI: BMP180UI,
    BOUNDS,
    ContextMenu: BMP180ContextMenu,
    contextMenuDuringRun: false,
    contextMenuOnlyDuringRun: true,
    validation,
};
