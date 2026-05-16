import manifest from './manifest.json';
import { SSD1306UI, BOUNDS } from './ui';
import { SSD1306Logic } from './logic';
import { validation } from './validation';
import { doc } from './doc';

export default { manifest, UI: SSD1306UI, BOUNDS, LogicClass: SSD1306Logic, validation, doc: doc };
