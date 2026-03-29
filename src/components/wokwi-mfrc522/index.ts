import manifest from './manifest.json';
import { MFRC522UI, MFRC522ContextMenu, BOUNDS } from './ui';
import { MFRC522Logic } from './logic';
import { validation } from './validation';
import docHtml from './doc/index.html?raw';

export default {
    manifest,
    UI:                       MFRC522UI,
    LogicClass:               MFRC522Logic,
    BOUNDS,
    ContextMenu:              MFRC522ContextMenu,
    contextMenuDuringRun:     true,
    contextMenuOnlyDuringRun: true,
    validation,
    doc: docHtml,
};
