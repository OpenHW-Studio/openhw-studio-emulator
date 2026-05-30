export const validation = {
    rules: [
        {
            id: 'max7219-power-check',
            description: 'MAX7219 needs VCC and GND properly connected',
            check(comp: any, graph: any, validator: any) {
                const vccVolts = validator?.calculateVoltageAtNode(`${comp.id}.VCC`);
                
                if (vccVolts !== undefined && vccVolts < 4.5) {
                    return { severity: 'warn', message: 'MAX7219 requires 5V on VCC' };
                }
                return null;
            }
        }
    ]
};
