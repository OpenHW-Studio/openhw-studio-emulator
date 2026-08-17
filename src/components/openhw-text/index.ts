import manifest from './manifest.json';
import { OpenHWTextUI, BOUNDS, OpenHWTextContextMenu } from './ui';
import { OpenHWTextLogic } from './logic';

export default {
    manifest,
    UI: OpenHWTextUI,
    LogicClass: OpenHWTextLogic,
    BOUNDS,
    ContextMenu: OpenHWTextContextMenu,
};
