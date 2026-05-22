import manifest from './manifest.json';
import { NRF24L01Logic as Logic } from './logic';
import { NRF24L01UI as UI, BOUNDS, NRF24L01ContextMenu as ContextMenu } from './ui';
import { validation } from './validation';

export const nrf24l01 = {
    manifest,
    Logic,
    UI,
    BOUNDS,
    ContextMenu,
    validation
};
