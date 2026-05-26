import { validation } from './validation';
import manifest from './manifest.json';
import { Pushbutton6mmLogic } from './logic';
import { Pushbutton6mmUI, Pushbutton6mmContextMenu, BOUNDS } from './ui';
import { doc } from './doc';

export default {
    manifest,
    LogicClass: Pushbutton6mmLogic,
    UI: Pushbutton6mmUI,
    ContextMenu: Pushbutton6mmContextMenu,
    BOUNDS,
    validation,
    doc: doc
};
