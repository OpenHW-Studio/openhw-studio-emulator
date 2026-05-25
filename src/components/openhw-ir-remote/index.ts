import { IRRemoteLogic } from './logic';
import { IRRemoteUI } from './ui';
import manifest from './manifest.json';

export default {
    manifest,
    LogicClass: IRRemoteLogic,
    UI: IRRemoteUI
};

