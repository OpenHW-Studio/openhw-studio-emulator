// Component v2 golden reference (index.ts = declarative registry record only).
// No fs/process/document touches at module top — worker/import-safe everywhere.
// Raw-source harvesting moved to build time (emulatorLoader ?raw glob).
import { validation } from './validation';
import manifest from './manifest.json';
import { ChargerLogic } from './logic';
import { ChargerUI, ChargerContextMenu, BOUNDS } from './ui';

export default {
    manifest,
    LogicClass: ChargerLogic,
    UI: ChargerUI,
    ContextMenu: ChargerContextMenu,
    contextMenuDuringRun: false,
    BOUNDS,
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
