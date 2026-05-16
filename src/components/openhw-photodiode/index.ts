import manifest from './manifest.json';
import { PhotodiodeLogic } from './logic';
import { PhotodiodeUI, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    Logic: PhotodiodeLogic,
    UI: PhotodiodeUI,
    BOUNDS,
    validation,
    doc: doc
};


