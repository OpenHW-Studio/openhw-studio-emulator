import { validation } from './validation';
import manifest from './manifest.json';
import { LCD1602Logic } from './logic';
import { LCD1602UI, LCD1602ContextMenu, BOUNDS } from './ui';

export default {
    manifest,
    LogicClass: LCD1602Logic,
    UI: LCD1602UI,
    ContextMenu: LCD1602ContextMenu,
    contextMenuDuringRun: false,
    BOUNDS,
    validation,
};