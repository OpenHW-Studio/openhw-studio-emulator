import manifest from './manifest.json';
import { DHT22Logic } from './logic';
import { DHT22UI } from './ui';
import { BOUNDS } from './constants';
import { validateConnections } from './validation';

const wokwiDht22 = {
    manifest,
    Logic: DHT22Logic,
    UI: DHT22UI,
    BOUNDS,
    validateConnections
};

export default wokwiDht22;
