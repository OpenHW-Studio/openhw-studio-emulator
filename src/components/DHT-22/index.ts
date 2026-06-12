import manifest from './manifest.json';
import { DHT22Logic } from './logic';
import { DHT22UI } from './ui';
import { BOUNDS } from './constants';
import { validation } from './validation';

const openhwDht22 = {
    manifest,
    LogicClass: DHT22Logic,
    UI: DHT22UI,
    BOUNDS,
    validation
};

export default openhwDht22;
