/**
 * raindrop-shared-state.ts
 *
 * Singleton shared state between the Raindrop Pad and Raindrop Module logic.
 * The Pad writes rainLevel/padVoltage; the Module reads and drives its pins.
 */
export const raindropSharedState = {
    rainLevel:    0,      // 0 (dry) – 1023 (completely wet)
    rainDetected: false,  // true when level > threshold
    padVoltage:   5.0,    // 0V (wet) – 5V (dry), inverted
    threshold:    300,    // user-adjustable via context menu
};
