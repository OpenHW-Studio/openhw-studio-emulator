import manifest from './manifest.json';
import { RaindropModuleLogic } from './logic';
import { RaindropModuleUI, RaindropModuleContextMenu } from './ui';
import { validateRaindropModule } from './validation';
import { BOUNDS } from './constants';

export default {
    manifest,
    UI: RaindropModuleUI,
    LogicClass: RaindropModuleLogic,
    ContextMenu: RaindropModuleContextMenu,
    BOUNDS,
    validation: validateRaindropModule,
};
