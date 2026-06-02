import manifest from './manifest.json';
import { HP4067UI, BOUNDS } from './ui';

// Minimal export shape expected by the frontend component registry
export default {
	manifest,
	UI: HP4067UI,
	BOUNDS,
	// LogicClass, validation and doc are optional and may be added later
};
