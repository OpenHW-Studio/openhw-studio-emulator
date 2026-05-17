export const validation = {
    rules: [
        {
            name: "Standard Power Check",
            check: (component: any, graph: any, validator: any) => {
                const pins = validator.getComponentPins(component);
                const vcc = pins.find((p:any) => p.includes('VCC') || p.includes('5V') || p.includes('3V3') || p.includes('V+'));
                const gnd = pins.find((p:any) => p.includes('GND'));
                
                if (vcc) {
                    const node = `${component.id}.${vcc}`;
                    if (validator.getNeighbors(node).length === 0) {
                        return '⚠️ [' + component.type + ' ' + component.id + '] Power is not connected.';
                    } else if (!validator.hasResistivePathToSupply(node)) {
                        return '⚠️ [' + component.type + ' ' + component.id + '] Power is connected but does not reach a valid power supply rail.';
                    }
                }

                if (gnd) {
                    const node = `${component.id}.${gnd}`;
                    if (validator.getNeighbors(node).length === 0) {
                        return '⚠️ [' + component.type + ' ' + component.id + '] Ground is not connected.';
                    } else {
                        const gndSources = validator.collectVoltageSources(node);
                        if (!gndSources.some((s: any) => s.voltage === 0)) {
                            return '⚠️ [' + component.type + ' ' + component.id + '] Ground is connected but does not reach a valid ground rail (GND).';
                        }
                    }
                }
                
                return null;
            }
        }
    ]
};
