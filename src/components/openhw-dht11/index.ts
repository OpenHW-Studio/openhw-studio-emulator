import manifest from './manifest.json';
import { DHT11Logic } from './logic';
import { DHT11UI, DHT11ContextMenu, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    LogicClass: DHT11Logic,
    UI: DHT11UI,
    BOUNDS,
    ContextMenu: DHT11ContextMenu,
    contextMenuDuringRun: true,
    contextMenuOnlyDuringRun: false,
    validation,
    doc
};
