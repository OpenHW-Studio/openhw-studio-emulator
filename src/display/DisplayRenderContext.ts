/**
 * useDisplayRenderWorker — Hook for display component UIs.
 *
 * Returns the Render Worker instance from the DisplayRenderContext,
 * or null if the simulation is not running / context is not provided.
 *
 * This file is the emulator-side hook. The Provider lives in the frontend:
 *   OpenHW-studio-frontend/src/pages/simulationpage/context/DisplayRenderContext.jsx
 *
 * The hook works because React Context is shared at runtime through the same
 * React instance — the emulator is a local package, not a separate bundle.
 */

import { createContext, useContext, useState, useEffect } from 'react';

// The context object is created here and imported by both the Provider (frontend)
// and the consumers (emulator UI components). Because both are in the same React tree,
// they share the same context instance.
export const DisplayRenderContext = createContext<Worker | null>(null);

export function useDisplayRenderWorker(): Worker | null {
    const contextWorker = useContext(DisplayRenderContext);
    const [worker, setWorker] = useState<Worker | null>(() => {
        if (typeof window !== 'undefined') {
            return (window as any).__displayRenderWorker || contextWorker;
        }
        return contextWorker;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handler = (e: any) => {
            setWorker(e.detail);
        };
        window.addEventListener('display-render-worker-changed', handler);
        
        // Sync current state
        setWorker((window as any).__displayRenderWorker || contextWorker);

        return () => {
            window.removeEventListener('display-render-worker-changed', handler);
        };
    }, [contextWorker]);

    return worker;
}
