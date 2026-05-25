export const validation = {
    rules: [
        {
            id: 'ili9341-touch-power',
            check: (comp: any, graph: any, validator: any) => {
                const vccPinId = comp.pins?.VCC || `${comp.id}:VCC`;
                const gndPinId = comp.pins?.GND || `${comp.id}:GND`;

                const vccVolt = validator.calculateVoltageAtNode(vccPinId);
                const gndVolt = validator.calculateVoltageAtNode(gndPinId);
                
                if (vccVolt < 3.0) {
                    return { type: 'warning', message: `${comp.label} requires at least 3.3V on VCC` };
                }
                if (gndVolt > 0.5) {
                    return { type: 'error', message: `${comp.label} has missing or poor ground connection` };
                }
                return null;
            }
        }
    ]
};
