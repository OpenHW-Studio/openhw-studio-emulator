// Component v2 golden reference (index.ts = declarative registry record only).
// No fs/process/document touches at module top — worker/import-safe everywhere.
// Raw-source harvesting moved to build time (emulatorLoader ?raw glob).
import manifest from './manifest.json';
import { MFRC522UI, MFRC522ContextMenu, BOUNDS } from './ui';
import { MFRC522Logic } from './logic';
import { validation } from './validation';

export default {
    manifest,
    UI: MFRC522UI,
    LogicClass: MFRC522Logic,
    BOUNDS,
    ContextMenu: MFRC522ContextMenu,
    contextMenuDuringRun: true,
    contextMenuOnlyDuringRun: false,
    validation,
    doc: null,
    // Raw sources are harvested at build time by the frontend's ?raw glob
    // (emulatorLoader.collectRawComponentSources) and merged into the live
    // registry there. Kept as empty-string fields so ComponentLab / zip-upload
    // / backend-sync code that reads uiRaw/logicRaw keeps working.
    uiRaw: '',
    logicRaw: '',
    validationRaw: '',
};
