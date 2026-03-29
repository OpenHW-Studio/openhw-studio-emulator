import manifest from './manifest.json';
import { BMP180UI, BMP180ContextMenu, BOUNDS } from './ui';
import { BMP180Logic } from './logic';
import { validation } from './validation';
import docHtml from './doc/index.html?raw';

export default {
    manifest,
    UI:                       BMP180UI,
    LogicClass:               BMP180Logic,
    BOUNDS,
    ContextMenu:              BMP180ContextMenu,
    contextMenuDuringRun:     true,   // slider is live-usable while running
    contextMenuOnlyDuringRun: true,   // hide the menu when simulation is stopped
    validation,
    doc: docHtml,
};
