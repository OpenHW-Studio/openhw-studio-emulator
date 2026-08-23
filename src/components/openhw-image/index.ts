import manifest from './manifest.json';
import { OpenHWImageUI, BOUNDS, OpenHWImageContextMenu } from './ui';
import { OpenHWImageLogic } from './logic';

export default {
  manifest,
  UI: OpenHWImageUI,
  LogicClass: OpenHWImageLogic,
  BOUNDS,
  ContextMenu: OpenHWImageContextMenu
};
