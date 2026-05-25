import manifest from './manifest.json';
import { HC595UI, BOUNDS } from './ui';
import { HC595Logic } from './logic';
import { doc } from './doc';
import { validation } from './validation';

export default { manifest, UI: HC595UI, BOUNDS, LogicClass: HC595Logic, doc, validation };
