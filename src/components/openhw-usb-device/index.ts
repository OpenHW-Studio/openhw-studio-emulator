import manifest from './manifest.json';
import { UsbDeviceUI, BOUNDS } from './ui';
import { UsbDeviceLogic } from './logic';

export default {
    manifest,
    LogicClass: UsbDeviceLogic,
    UI: UsbDeviceUI,
    BOUNDS,
};
