import manifest from './manifest.json';
import { ADXL345UI, ADXL345ContextMenu, BOUNDS } from './ui';
import { ADXL345Logic } from './logic';
import { validation } from './validation';
const docHtml = '';

export default {
    manifest,
    UI:                       ADXL345UI,
    LogicClass:               ADXL345Logic,
    BOUNDS,
    ContextMenu:              ADXL345ContextMenu,
    contextMenuDuringRun:     true,
    contextMenuOnlyDuringRun: true,
    validation,
    doc: docHtml,
};
