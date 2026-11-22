import manifest from './manifest.json';
import { HP4067UI, BOUNDS } from './ui';
import { HP4067Logic } from './logic';

// Export shape expected by the frontend component registry.
export default {
	manifest,
	UI: HP4067UI,
	BOUNDS,
	LogicClass: HP4067Logic,
};
