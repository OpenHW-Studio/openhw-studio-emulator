import { createValidationIssue } from '../component-schema.js';
import type { ComponentValidationRule } from '../component-schema.js';

export const validation: { rules: ComponentValidationRule[] } = {
  rules: [
    {
      id: 'ldr_resistor_connection',
      title: 'LDR Resistor Connection',
      description: 'LDR resistor should be connected in a voltage divider circuit with a pull-up resistor',
      check: (component: any) => {
        const p1Connected = component.pinConnections?.p1?.length > 0;
        const p2Connected = component.pinConnections?.p2?.length > 0;
        return p1Connected && p2Connected;
      }
    },
    {
      id: 'ldr_resistor_values',
      title: 'LDR Resistor Attributes',
      description: 'LDR resistor attributes (lux, gamma, r10) should be within reasonable ranges',
      check: (component: any) => {
        const r10 = parseFloat(component.attrs?.r10);
        const gamma = parseFloat(component.attrs?.gamma);
        const lux = parseFloat(component.attrs?.lux);
        
        // R10 should be between 100Ω and 1MΩ
        const r10Valid = r10 > 100 && r10 < 1000000;
        // Gamma should be between 0.3 and 1.5
        const gammaValid = gamma > 0.3 && gamma < 1.5;
        // Lux should be positive
        const luxValid = lux > 0;
        
        return r10Valid && gammaValid && luxValid;
      }
    }
  ]
};
