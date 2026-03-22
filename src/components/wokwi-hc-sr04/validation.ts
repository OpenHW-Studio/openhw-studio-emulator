export const validation = [
    {
        type: 'missing-connection',
        check: (comp: any, wires: any[]) => {
            const connectedPins = wires.flatMap(w => [w.from, w.to]);
            const hasVCC = connectedPins.includes(`${comp.id}:VCC`);
            const hasGND = connectedPins.includes(`${comp.id}:GND`);
            const hasTRIG = connectedPins.includes(`${comp.id}:TRIG`);
            const hasECHO = connectedPins.includes(`${comp.id}:ECHO`);

            if (!hasVCC || !hasGND) {
                return `HC-SR04 ${comp.id} requires VCC and GND connections to function`;
            }
            if (!hasTRIG || !hasECHO) {
                return `HC-SR04 ${comp.id} requires TRIG and ECHO connections`;
            }
            return null;
        }
    }
];
