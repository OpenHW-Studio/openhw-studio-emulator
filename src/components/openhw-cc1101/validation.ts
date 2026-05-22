export function validation(pins: any) {
    const errors = [];
    if (!pins['VCC']) errors.push("VCC must be connected to power.");
    if (!pins['GND']) errors.push("GND must be connected to ground.");
    if (!pins['MOSI']) errors.push("MOSI must be connected to SPI MOSI.");
    if (!pins['MISO']) errors.push("MISO must be connected to SPI MISO.");
    if (!pins['SCK']) errors.push("SCK must be connected to SPI SCK.");
    if (!pins['CSN']) errors.push("CSN must be connected to SPI CSN.");
    return errors;
}
