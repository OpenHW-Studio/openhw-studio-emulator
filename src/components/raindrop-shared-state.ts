/**
 * Shared singleton state between the Raindrop Pad and Raindrop Module.
 * The Pad computes the rain data; the Module reads it and drives AO/DO pins.
 */
export const raindropSharedState = {
    wetness: 0,        // 0-100%
    rainLevel: 0,      // 0-1023 (ADC scale)
    rainDetected: false,
    threshold: 300,    // Set via Module context menu
    padVoltage: 5.0,   // Analog voltage (5V=dry, 0V=wet)
};
