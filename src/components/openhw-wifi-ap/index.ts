/**
 * openhw-wifi-ap/index.ts
 * Barrel export for the WiFi AP component.
 */

export { WiFiApLogic as default } from './logic';
export { WiFiApLogic } from './logic';
export { WiFiApUI } from './ui';
export { validate } from './validation';

import manifest from './manifest.json';
export { manifest };
