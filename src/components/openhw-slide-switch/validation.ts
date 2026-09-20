// Component v2: validation logic lives in logic.ts::validate() (single source).
// This module is a backward-compat shim — registry/validator code that imports
// './validation' keeps working unchanged. New code should call logic.validate().
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
    rules: []
};
