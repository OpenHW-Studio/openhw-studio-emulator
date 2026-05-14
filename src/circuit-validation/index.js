import { FullCircuitValidator } from './engine.js';
import { analyzeCodeHardwareSync } from './sync-analyzer.js';
import { ProtocolAnalyzer } from './protocol-analyzer.js';

export { FullCircuitValidator, analyzeCodeHardwareSync, ProtocolAnalyzer };

/**
 * Unified Validation Engine Entry Point
 * Runs both physics-based circuit validation and software-hardware sync analysis.
 * 
 * @param {Object} project { components, connections, code, activeCodeFileId }
 * @param {Object} options Validation options (profile, incremental, etc.)
 * @returns {Object} { safe, physicsSafe, syncPassed, errors, syncIssues, healthScore }
 */
export const runUnifiedValidation = (project, options = {}) => {
    // 1. Physics & Wiring Validation
    const validator = new FullCircuitValidator(project, { registry: options.registry });
    const physicsSafe = validator.runValidation(options);

    // 2. Software-Hardware Sync Analysis
    const syncResult = analyzeCodeHardwareSync(project);
    
    // 3. Unified Health Score Calculation
    const healthScore = validator.calculateHealthScore(syncResult.issues || []);

    return {
        safe: physicsSafe && syncResult.passed,
        physicsSafe,
        syncPassed: syncResult.passed,
        errors: validator.errors || [],
        syncIssues: syncResult.issues || [],
        healthScore
    };
};

// The Integration "Glue" Code (legacy helper)
export const handleCompileAndRun = (projectState, startCompilationPipeline, handleValidationFailure) => {
    const { safe, errors } = runUnifiedValidation(projectState);

    if (!safe) {
        if (handleValidationFailure) handleValidationFailure(errors);
        return; 
    }

    if (startCompilationPipeline) startCompilationPipeline(projectState.code);
};
