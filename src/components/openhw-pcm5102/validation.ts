export function validation(pins: any) {
    const errors = [];
    if (!pins['VCC']) errors.push("VCC must be connected to power.");
    if (!pins['GND']) errors.push("GND must be connected to ground.");
    if (!pins['LCK']) errors.push("LCK must be connected to I2S WS (Word Select).");
    if (!pins['BCK']) errors.push("BCK must be connected to I2S BCLK.");
    if (!pins['DIN']) errors.push("DIN must be connected to I2S DOUT.");
    return errors;
}
