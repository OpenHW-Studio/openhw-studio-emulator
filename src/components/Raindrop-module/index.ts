import manifest from './manifest.json';
import { RaindropModuleLogic } from './logic';
import { RaindropModuleUI, RaindropModuleContextMenu } from './ui';
import { validateRaindropModule } from './validation';
import { BOUNDS } from './constants';

export default {
    manifest,
    Logic: RaindropModuleLogic,
    UI: RaindropModuleUI,
    ContextMenu: RaindropModuleContextMenu,
    validate: validateRaindropModule,
    bounds: BOUNDS,
};
