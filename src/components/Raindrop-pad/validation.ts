export function validateRaindropPad(component: any, allComponents: any[], wires: any[]): string | null {
    const id = component.id;
    const connectedPins = new Set<string>();
    for (const wire of wires) {
        if (wire[0] === id) connectedPins.add(wire[1]);
        if (wire[2] === id) connectedPins.add(wire[3]);
    }
    if (!connectedPins.has('AOUT')) {
        return `⚠️ [Rain Pad ${id}] AOUT is not connected. Wire it to the Raindrop Module's PAD+ pin.`;
    }
    if (!connectedPins.has('GND')) {
        return `⚠️ [Rain Pad ${id}] GND is not connected.`;
    }
    return null;
}
