export function validateRaindropModule(component: any, allComponents: any[], wires: any[]): string | null {
    const id = component.id;
    const connectedPins = new Set<string>();
    for (const wire of wires) {
        if (wire[0] === id) connectedPins.add(wire[1]);
        if (wire[2] === id) connectedPins.add(wire[3]);
    }
    if (!connectedPins.has('VCC')) return `⚠️ [Raindrop Module ${id}] VCC is not connected.`;
    if (!connectedPins.has('GND')) return `⚠️ [Raindrop Module ${id}] GND is not connected.`;
    if (!connectedPins.has('PAD+')) return `⚠️ [Raindrop Module ${id}] PAD+ is not connected. Wire it to the Rain Pad's AOUT pin.`;
    if (!connectedPins.has('AO') && !connectedPins.has('DO')) {
        return `⚠️ [Raindrop Module ${id}] Neither AO nor DO is connected to the microcontroller.`;
    }
    return null;
}
