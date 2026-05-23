import * as manifest from './manifest.json';
import { LDRResistorLogic } from './logic';
import { LDRResistorUI, BOUNDS } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
  manifest,
  Logic: LDRResistorLogic,
  UI: LDRResistorUI,
  BOUNDS,
  validation,
  doc
};
