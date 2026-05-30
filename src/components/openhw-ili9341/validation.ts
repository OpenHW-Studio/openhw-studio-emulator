export const validation = {
    rules: [
        {
            id: 'ili9341-power',
            check: (comp: any, graph: any, validator: any) => {
                const vccVolt = validator?.calculateVoltageAtNode(`${comp.id}.VCC`);
                const gndVolt = validator?.calculateVoltageAtNode(`${comp.id}.GND`);
                
                if (vccVolt !== undefined && vccVolt < 3.0) {
                    return { severity: 'warn', message: `${comp.label || 'ILI9341'} requires at least 3.3V on VCC` };
                }
                if (gndVolt !== undefined && gndVolt > 0.5) {
                    return { severity: 'error', message: `${comp.label || 'ILI9341'} has missing or poor ground connection` };
                }
                return null;
            }
        }
    ]
};
