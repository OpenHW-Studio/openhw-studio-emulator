import manifest from './manifest.json';
import { LdrModuleUI, LdrContextMenu, BOUNDS } from './ui';
import { LdrModuleLogic } from './logic';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    UI: LdrModuleUI,
    LogicClass: LdrModuleLogic,
    BOUNDS,
    ContextMenu: LdrContextMenu,
    contextMenuDuringRun: false,
    contextMenuOnlyDuringRun: false,
    validation,
    doc: doc
};
