import manifest from './manifest.json';
import { PhotoresistorLogic } from './logic';
import { PhotoresistorUI, PhotoresistorContextMenu, BOUNDS } from './ui';
const docHtml = '';

export default {
    manifest,
    LogicClass: PhotoresistorLogic,
    UI: PhotoresistorUI,
    BOUNDS,
    ContextMenu: PhotoresistorContextMenu,
    contextMenuOnlyDuringRun: true,
    doc: docHtml
};
