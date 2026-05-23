export function validation(pins: any) {
    const errors = [];
    if (!pins['IN+']) {
        errors.push("IN+ must be connected to an audio source.");
    }
    if (!pins['IN-']) {
        errors.push("IN- must be connected to ground.");
    }
    return errors;
}
