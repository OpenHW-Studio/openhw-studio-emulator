import { BaseComponent } from "../BaseComponent";

export function validateConnections(component: BaseComponent, currentWires: any[]): string[] {
    const errors: string[] = [];
    
    // Check if VCC and GND are connected
    const hasVCC = currentWires.some(w => w.from === `${component.id}:VCC` || w.to === `${component.id}:VCC`);
    const hasGND = currentWires.some(w => w.from === `${component.id}:GND` || w.to === `${component.id}:GND`);
    
    if (!hasVCC || !hasGND) {
        errors.push(`DHT22 Sensor (${component.id}) needs both VCC and GND connected`);
    }

    // Check if SDA is connected
    const hasSDA = currentWires.some(w => w.from === `${component.id}:SDA` || w.to === `${component.id}:SDA`);
    if (!hasSDA) {
        errors.push(`DHT22 Sensor (${component.id}) needs SDA connected for reading data`);
    }

    return errors;
}
