export function validation(pins: any) {
    const errors = [];
    if (!pins['VIN']) errors.push("VIN must be connected to power.");
    if (!pins['GND']) errors.push("GND must be connected to ground.");
    if (!pins['LRC']) errors.push("LRC must be connected to I2S WS (Word Select).");
    if (!pins['BCLK']) errors.push("BCLK must be connected to I2S BCLK.");
    if (!pins['DIN']) errors.push("DIN must be connected to I2S DOUT.");
    return errors;
}
