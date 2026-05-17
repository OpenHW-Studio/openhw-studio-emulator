import manifest from './manifest.json';
import { Openhw7SegmentLogic } from './logic';
import { Openhw7SegmentUI } from './ui';
import { validation } from './validation';
import { doc } from './doc';

export default {
    manifest,
    LogicClass: Openhw7SegmentLogic,
    UI: Openhw7SegmentUI,
    validation,
    doc: doc
};