export function validation(pins: any) {
    const errors = [];
    if (!pins['VDD']) errors.push("VDD must be connected to power.");
    if (!pins['GND']) errors.push("GND must be connected to ground.");
    if (!pins['LRCL']) errors.push("LRCL must be connected to I2S WS (Word Select).");
    if (!pins['BCLK']) errors.push("BCLK must be connected to I2S BCLK.");
    if (!pins['DOUT']) errors.push("DOUT must be connected to I2S DIN.");
    return errors;
}
