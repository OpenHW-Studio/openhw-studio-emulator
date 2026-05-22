import manifest from './manifest.json';
import { CC1101Logic as Logic } from './logic';
import { CC1101UI as UI, BOUNDS, CC1101ContextMenu as ContextMenu } from './ui';
import { validation } from './validation';

export const cc1101 = {
    manifest,
    Logic,
    UI,
    BOUNDS,
    ContextMenu,
    validation
};
