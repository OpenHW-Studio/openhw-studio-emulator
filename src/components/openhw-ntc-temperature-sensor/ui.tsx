import React from 'react';

export const NtcUI = ({ state, attrs, onAttrChange, onInteract, isRunning }: { state: any, attrs: any, onAttrChange?: (key: string, val: any) => void, onInteract?: (e: any) => void, isRunning: boolean }) => {
    const temp = state?.temperature ?? attrs?.temperature ?? 25;
    const [localTemp, setLocalTemp] = React.useState(() => {
        if (typeof sessionStorage !== 'undefined') {
            return sessionStorage.getItem('openhw-ntc-temp') ?? temp;
        }
        return temp;
    });
    const isDraggingRef = React.useRef(false);
    const hasInitializedRef = React.useRef(false);

    React.useEffect(() => {
        const handleGlobalUp = () => {
            isDraggingRef.current = false;
        };
        window.addEventListener('pointerup', handleGlobalUp);
        window.addEventListener('pointercancel', handleGlobalUp);
        return () => {
            window.removeEventListener('pointerup', handleGlobalUp);
            window.removeEventListener('pointercancel', handleGlobalUp);
        };
    }, []);

    React.useEffect(() => {
        if (!isRunning) {
            hasInitializedRef.current = false;
        }
    }, [isRunning]);

    React.useEffect(() => {
        if (isRunning && !hasInitializedRef.current && onInteract) {
            hasInitializedRef.current = true;
            if (typeof sessionStorage !== 'undefined') {
                const saved = sessionStorage.getItem('openhw-ntc-temp');
                if (saved) {
                    onInteract({ type: 'temperature', value: saved });
                    // Send again after a delay to ensure worker has started
                    setTimeout(() => {
                        onInteract({ type: 'temperature', value: saved });
                    }, 250);
                    setLocalTemp(saved);
                    return;
                }
            }
        }

        // Only override localTemp if we are running and not dragging
        // If the backend sends an older state, this might revert the slider briefly, 
        // but the timeout above will re-correct it.
        if (!isDraggingRef.current && isRunning) {
            setLocalTemp(temp);
        }
    }, [temp, isRunning, onInteract]);

    const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalTemp(val);
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('openhw-ntc-temp', val);
        }
        if (onInteract) {
            onInteract({ type: 'temperature', value: val });
        }
        if (onAttrChange) {
            onAttrChange('temperature', val);
        }
    };

    const nativeW = 30;
    const nativeH = 30;
    const scale = BOUNDS.w / nativeW;

    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
            <svg 
                width={nativeW} height={nativeH} viewBox="0 0 30 30" 
                style={{ 
                    display: 'block',
                    transform: `scale(${scale})`,
                    transformOrigin: '0 0'
                }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <radialGradient id="beadGrad" cx="40%" cy="30%" r="60%" fx="40%" fy="30%">
                        <stop offset="0%" style={{ stopColor: '#3498db', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#1a5276', stopOpacity: 1 }} />
                    </radialGradient>
                    <radialGradient id="beadHighlight" cx="30%" cy="20%" r="50%">
                        <stop offset="0%" style={{ stopColor: 'white', stopOpacity: 0.4 }} />
                        <stop offset="100%" style={{ stopColor: 'white', stopOpacity: 0 }} />
                    </radialGradient>
                </defs>

                {/* Pins */}
                <path d="M 12 15 L 6 30" stroke="#bdc3c7" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 18 15 L 24 30" stroke="#bdc3c7" strokeWidth="1.5" strokeLinecap="round" />

                {/* Epoxy Bead */}
                <path 
                    d="M 15 5 C 10 5, 8 10, 10 15 C 12 20, 18 20, 20 15 C 22 10, 20 5, 15 5 Z" 
                    fill="url(#beadGrad)" 
                    stroke="#2980b9" 
                    strokeWidth="0.5" 
                />
                
                {/* Glossy Highlight */}
                <ellipse cx="13" cy="10" rx="3" ry="4" fill="url(#beadHighlight)" transform="rotate(-20, 13, 10)" />
            </svg>

            {/* Hidden simulation slider (only shows when running) */}
            {isRunning && (
                <div style={{ 
                    position: 'absolute', 
                    top: '-45px', 
                    background: 'rgba(0,0,0,0.85)', 
                    padding: '6px 10px', 
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    pointerEvents: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onMouseMove={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>Temp</span>
                        <span>{localTemp}°C</span>
                    </div>
                    <input 
                        type="range" 
                        min="-40" 
                        max="125" 
                        value={localTemp} 
                        onChange={handleSlider}
                        onMouseDown={(e) => { e.stopPropagation(); isDraggingRef.current = true; }}
                        onPointerDown={(e) => { e.stopPropagation(); isDraggingRef.current = true; }}
                        onTouchStart={(e) => { e.stopPropagation(); isDraggingRef.current = true; }}
                        onMouseUp={(e) => { e.stopPropagation(); isDraggingRef.current = false; }}
                        onPointerUp={(e) => { e.stopPropagation(); isDraggingRef.current = false; }}
                        onTouchEnd={(e) => { e.stopPropagation(); isDraggingRef.current = false; }}
                        style={{ width: '80px', height: '4px', cursor: 'pointer' }}
                    />
                </div>
            )}
        </div>
    );
};

export const BOUNDS = { x: 0, y: 0, w: 22.5, h: 22.5 };
