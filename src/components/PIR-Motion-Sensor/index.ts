import { validation } from './validation';
import manifest from './manifest.json';
import { PIRLogic } from './logic';
import { PIRUI, PIRContextMenu } from './ui';
import { BOUNDS } from './constants';

export default {
    manifest,
    LogicClass: PIRLogic,
    UI: PIRUI,
    ContextMenu: PIRContextMenu,
    bounds: BOUNDS,
    validation
};
