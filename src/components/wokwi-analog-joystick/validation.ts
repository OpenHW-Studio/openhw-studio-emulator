export const validation = [
    {
        type: 'missing-connection',
        check: (comp: any, wires: any[]) => {
            const connectedPins = wires.flatMap(w => [w.from, w.to]);
            const hasVCC = connectedPins.includes(`${comp.id}:VCC`);
            const hasGND = connectedPins.includes(`${comp.id}:GND`);
            const hasOutputs = connectedPins.includes(`${comp.id}:HOR`) || 
                               connectedPins.includes(`${comp.id}:VER`) || 
                               connectedPins.includes(`${comp.id}:SEL`);

            if (!hasVCC || !hasGND) {
                return `Analog Joystick ${comp.id} requires VCC and GND connections to function`;
            }
            if (!hasOutputs) {
                return `Analog Joystick ${comp.id} has no output pins (HOR, VER, or SEL) connected`;
            }
            return null;
        }
    }
];
