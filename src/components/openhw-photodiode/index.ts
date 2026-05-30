import manifest from './manifest.json';
import { PhotodiodeLogic } from './logic';
import { PhotodiodeUI, PhotodiodeContextMenu, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    Logic: PhotodiodeLogic,
    UI: PhotodiodeUI,
    ContextMenu: PhotodiodeContextMenu,
    BOUNDS,
    validation,
    doc: doc
};
