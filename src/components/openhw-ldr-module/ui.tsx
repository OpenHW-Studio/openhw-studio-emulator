import React, { useState, useEffect } from 'react';

// Context Menu for live tuning
export const LdrContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => {
    const lux = attrs?.lux ?? 100;
    const threshold = attrs?.threshold ?? 500;

    // Update manifest attributes AND send data to the running Web Worker
    const handleSlider = (key: string, value: number) => {
        onUpdate(key, value);
        if (attrs && attrs.onInteract) {
            attrs.onInteract({ type: 'SET_ATTR', key, value });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }} data-contextmenu="true">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '10px', color: 'var(--text2)', marginBottom: '2px' }}>Lux: {lux}</label>
                <input 
                    type="range" min="0" max="1000" step="1" value={lux}
                    onChange={(e) => handleSlider('lux', parseFloat(e.target.value))}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{ width: '80px', cursor: 'pointer' }}
                />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '10px', color: 'var(--text2)', marginBottom: '2px' }}>Threshold: {threshold}</label>
                <input 
                    type="range" min="0" max="1000" value={threshold}
                    onChange={(e) => handleSlider('threshold', parseFloat(e.target.value))}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{ width: '80px', cursor: 'pointer' }}
                />
            </div>
        </div>
    );
};

// BOUNDS: covers the full visual area.
export const BOUNDS = { x: 0, y: 0, w: 180, h: 75 };

export const LdrModuleUI = ({ state, attrs, isRunning, onEvent }: { state: any, attrs: any, isRunning?: boolean, onEvent?: (event: any) => void }) => {
    const pwrLed = state?.pwrLed || false;
    const doLed = state?.doLed || false;

    const externalLight = state?.light ?? attrs?.lux ?? 100;
    const [localLight, setLocalLight] = useState(externalLight);

    const externalThreshold = state?.threshold ?? attrs?.threshold ?? 500;
    const [localThreshold, setLocalThreshold] = useState(externalThreshold);

    useEffect(() => {
        setLocalLight(externalLight);
    }, [externalLight]);

    useEffect(() => {
        setLocalThreshold(externalThreshold);
    }, [externalThreshold]);

    const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Math.round(parseFloat(e.target.value));
        setLocalLight(val);
        if (onEvent) {
            onEvent({ type: 'SET_ATTR', key: 'lux', value: val });
        }
        if (attrs && attrs.onInteract) {
            attrs.onInteract({ type: 'SET_ATTR', key: 'lux', value: val });
        }
    };

    const handleThresholdSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Math.round(parseFloat(e.target.value));
        setLocalThreshold(val);
        if (onEvent) {
            onEvent({ type: 'SET_ATTR', key: 'threshold', value: val });
        }
        if (attrs && attrs.onInteract) {
            attrs.onInteract({ type: 'SET_ATTR', key: 'threshold', value: val });
        }
    };

    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}
             onClick={(e) => { if (isRunning) e.stopPropagation(); }}
             onContextMenu={(e) => { if (isRunning) e.stopPropagation(); }}>
            <svg width="100%" height="100%" viewBox="0 0 180 75" version="1.1" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', overflow: 'visible', pointerEvents: 'none' }}>
                {/* Board */}
                <path d="M 153 0 H 17 V 75 H 153 Z M 24 65.5 c 1.9 0 3.44 1.5 3.44 3.34 s -1.54 3.34 -3.44 3.34 -3.44 -1.5 -3.44 -3.34 1.54 -3.34 3.44 -3.34 Z M 122.3 22.2 c 4.17 0 7.55 3.38 7.55 7.55 s -3.38 7.55 -7.55 7.55 -7.55 -3.38 -7.55 -7.55 3.38 -7.55 7.55 -7.55 Z M 24 2.8 c 1.9 0 3.44 1.5 3.44 3.34 s -1.54 3.34 -3.44 3.34 -3.44 -1.5 -3.44 -3.34 1.54 -3.34 3.44 -3.34 Z" fill="#1c2546" />

                {/* Photo sensor */}
                <rect x="18.9" y="20.1" width="11.2" height="22.2" fill="none" stroke="#fff" strokeWidth="1.08" />
                <circle cx="24.5" cy="25.6" r="3.14" fill="#dae3eb" />
                <circle cx="24.5" cy="36.8" r="3.14" fill="#dae3eb" />
                <path d="m24.5 25.7c0-0.199-0.079-0.39-0.22-0.53-0.14-0.141-0.331-0.22-0.529-0.22h-23c-0.199 0-0.389 0.079-0.53 0.22-0.14 0.14-0.219 0.331-0.219 0.53 0 0.198 0.079 0.389 0.219 0.53 0.141 0.14 0.331 0.219 0.53 0.219h23c0.198 0 0.389-0.079 0.529-0.219 0.141-0.141 0.22-0.332 0.22-0.53z" fill="#a8b6ba" />
                <path d="m24.5 36.7c0-0.198-0.079-0.389-0.22-0.53-0.14-0.14-0.331-0.219-0.529-0.219h-23c-0.199 0-0.389 0.079-0.53 0.219-0.14 0.141-0.219 0.332-0.219 0.53 0 0.199 0.079 0.39 0.219 0.53 0.141 0.141 0.331 0.22 0.53 0.22h23c0.198 0 0.389-0.079 0.529-0.22 0.141-0.14 0.22-0.331 0.22-0.53z" fill="#a8b6ba" />
                <path d="m8.64 22.8c0-0.375-0.304-0.679-0.679-0.679h-6.14c-0.375 0-0.679 0.304-0.679 0.679v16.8c0 0.375 0.304 0.679 0.679 0.679h6.14c0.375 0 0.679-0.304 0.679-0.679v-16.8z" fill="#cc4247" />

                {/* Holes */}
                <g fill="none" strokeWidth="1.08">
                    <ellipse cx="24.5" cy="6.11" rx="3.43" ry="3.34" stroke="#a8b6ba" />
                    <ellipse cx="24.5" cy="68.84" rx="3.43" ry="3.34" stroke="#a8b6ba" />
                    {/* +/- */}
                    <g stroke="#fff">
                        <path d="m24 44.7v4.75" />
                        <path d="m24 12.1v4.75" />
                        <path d="m26.4 14.5h-4.75" />
                    </g>
                </g>

                {/* Resistors */}
                <g fill="#dae3eb">
                    <rect x="37.7" y="8.69" width="16.7" height="5.52" />
                    <rect x="37.7" y="22" width="16.7" height="5.52" />
                    <rect x="37.7" y="34.5" width="16.7" height="5.52" />
                </g>
                <rect x="41.9" y="34.3" width="8.43" height="5.9" fill="#29261c" />
                <path d="m108 21.2v-16.7h-5.52v16.7z" fill="#dae3eb" />
                <path d="m108 17v-8.43h-5.9v8.43z" fill="#29261c" />
                <path d="m108 53.8v-16.7h-5.52v16.7z" fill="#dae3eb" />
                <path d="m108 49.7v-8.43h-5.9v8.43z" fill="#29261c" />
                <rect x="37.7" y="47.5" width="16.7" height="5.52" fill="#dae3eb" />
                <rect x="41.9" y="8.5" width="8.43" height="5.9" fill="#907463" />
                <rect x="41.9" y="21.8" width="8.43" height="5.9" fill="#907463" />
                <rect x="41.9" y="47.3" width="8.43" height="5.9" fill="#29261c" />

                {/* LEDs */}
                <rect x="118" y="4.77" width="13" height="4.29" fill="#dae3eb" />
                <rect x="121" y="4.62" width="6.55" height="4.59" fill="#fffefe" />
                <defs>
                    <filter id="ledFilter" x="-0.8" y="-0.8" height="5.2" width="5.8">
                        <feGaussianBlur stdDeviation="2" />
                    </filter>
                </defs>
                {pwrLed && <circle cx="124.5" cy="7" r="4" fill="green" filter="url(#ledFilter)" />}

                <rect x="118" y="52.6" width="13" height="4.29" fill="#dae3eb" />
                <rect x="121" y="52.5" width="6.55" height="4.59" fill="#fffefe" />
                {doLed && <circle cx="124.5" cy="55" r="4" fill="red" filter="url(#ledFilter)" />}

                {/* Chip */}
                <g fill="#dae3eb">
                    <path d="m72.7 34.6h-9.67c-0.407 0-0.796 0.162-1.08 0.449-0.287 0.287-0.448 0.677-0.448 1.08v1e-3c0 0.406 0.161 0.796 0.448 1.08 0.288 0.287 0.677 0.448 1.08 0.448h9.67z" />
                    <path d="m72.7 40.4h-9.67c-0.407 0-0.796 0.162-1.08 0.449-0.287 0.287-0.448 0.677-0.448 1.08v1e-3c0 0.406 0.161 0.796 0.448 1.08 0.288 0.287 0.677 0.448 1.08 0.448h9.67z" />
                    <path d="m72.7 46.2h-9.67c-0.407 0-0.796 0.162-1.08 0.449-0.287 0.287-0.448 0.677-0.448 1.08v1e-3c0 0.406 0.161 0.796 0.448 1.08 0.288 0.288 0.677 0.449 1.08 0.449h9.67z" />
                    <path d="m72.7 52h-9.67c-0.407 0-0.796 0.162-1.08 0.449-0.287 0.287-0.448 0.677-0.448 1.08v1e-3c0 0.406 0.161 0.796 0.448 1.08 0.288 0.288 0.677 0.449 1.08 0.449h9.67z" />
                    <path d="m84.4 55.1h9.67c0.406 0 0.796-0.161 1.08-0.449 0.288-0.287 0.449-0.677 0.449-1.08v-1e-3c0-0.406-0.161-0.796-0.449-1.08-0.287-0.287-0.677-0.449-1.08-0.449h-9.67z" />
                    <path d="m84.4 49.3h9.67c0.406 0 0.796-0.161 1.08-0.449 0.288-0.287 0.449-0.677 0.449-1.08v-1e-3c0-0.406-0.161-0.796-0.449-1.08-0.287-0.287-0.677-0.449-1.08-0.449h-9.67z" />
                    <path d="m84.4 43.5h9.67c0.406 0 0.796-0.161 1.08-0.448 0.288-0.288 0.449-0.678 0.449-1.08v-1e-3c0-0.406-0.161-0.796-0.449-1.08-0.287-0.287-0.677-0.449-1.08-0.449h-9.67z" />
                    <path d="m84.4 37.7h9.67c0.406 0 0.796-0.161 1.08-0.448 0.288-0.288 0.449-0.678 0.449-1.08v-1e-3c0-0.406-0.161-0.796-0.449-1.08-0.287-0.287-0.677-0.449-1.08-0.449h-9.67z" />
                </g>
                <rect x="70.3" y="33.2" width="16.1" height="23.3" fill="#29261c" />

                {/* Decorations */}
                <rect x="62.8" y="0" width="32.1" height="32.1" fill="#466fb5" />
                <circle cx="78.9" cy="16" r="6.56" fill="#bcc2d5" />
                <path d="m78.9 6.72v18.6" fill="none" stroke="#3f3c40" strokeWidth="2.5" />
                <path d="m88.2 16h-18.6" fill="none" stroke="#3f3c40" strokeWidth="2.5" />
                <path d="m123 19.8c5.5 0 9.96 4.46 9.96 9.96s-4.46 9.96-9.96 9.96-9.96-4.46-9.96-9.96 4.46-9.96 9.96-9.96zm0 2.4c4.17 0 7.55 3.38 7.55 7.55 0 4.17-3.38 7.55-7.55 7.55s-7.55-3.38-7.55-7.55c0-4.17 3.38-7.55 7.55-7.55z" fill="#d4d0d1" />

                {/* Text */}
                <text fill="#fffefe" fontSize="4.4" fontFamily="sans-serif">
                    <tspan x="117.46" y="13.90">PWR</tspan>
                    <tspan x="117.46" y="18.41">LED</tspan>
                    <tspan x="127" y="16.5">VCC</tspan>
                    <tspan x="127" y="31.5">GND</tspan>
                    <tspan x="129" y="46.5">DO</tspan>
                    <tspan x="129" y="61.5">AO</tspan>
                    <tspan x="117.44" y="45.53">DO</tspan>
                    <tspan x="117.44" y="50.036">LED</tspan>
                </text>

                {/* Board pins */}
                <path d="m143 10 v55 h8.39 v-55z" fill="none" stroke="#fff" strokeLinejoin="round" strokeWidth=".4" />
                <g fill="#433b38">
                    <path d="m144 56.725 v6.55 h6.55 v-6.55z" />
                    <path d="m144 41.725 v6.55 h6.55 v-6.55z" />
                    <path d="m144 26.725 v6.55 h6.55 v-6.55z" />
                    <path d="m144 11.725 v6.55 h6.55 v-6.55z" />
                </g>
                <g fill="#9f9f9f">
                    <path d="m147 58.558 c-0.382 0-0.748 0.152-1.02 0.422-0.27 0.27-0.421 0.636-0.421 1.02v1e-3c0 0.382 0.151 0.748 0.421 1.02 0.271 0.271 0.637 0.422 1.02 0.422h33c0.233 0 0.423-0.189 0.423-0.423v-2.04c0-0.234-0.19-0.423-0.423-0.423h-33z" />
                    <path d="m147 43.558 c-0.382 0-0.748 0.152-1.02 0.422-0.27 0.27-0.421 0.636-0.421 1.02v1e-3c0 0.382 0.151 0.748 0.421 1.02 0.271 0.271 0.637 0.422 1.02 0.422h33c0.233 0 0.423-0.189 0.423-0.423v-2.04c0-0.234-0.19-0.423-0.423-0.423h-33z" />
                    <path d="m147 28.558 c-0.382 0-0.748 0.151-1.02 0.422-0.27 0.27-0.421 0.636-0.421 1.02v1e-3c0 0.382 0.151 0.748 0.421 1.02 0.271 0.27 0.637 0.422 1.02 0.422h33c0.233 0 0.423-0.19 0.423-0.423v-2.04c0-0.234-0.19-0.423-0.423-0.423h-33z" />
                    <path d="m147 13.558 c-0.382 0-0.748 0.152-1.02 0.422-0.27 0.27-0.421 0.637-0.421 1.02s0.151 0.749 0.421 1.02c0.271 0.27 0.637 0.422 1.02 0.422h33c0.233 0 0.423-0.19 0.423-0.424v-2.03c0-0.234-0.19-0.424-0.423-0.424h-33z" />
                </g>
            </svg>
            {isRunning && (
                <div style={{ 
                    position: 'absolute', 
                    top: '-35px', 
                    left: '50%',
                    transform: 'translateX(-50%)',
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
                    border: '1px solid rgba(255,255,255,0.1)',
                    whiteSpace: 'nowrap'
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseMove={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>Illumination</span>
                        <span>{Math.round(localLight)} lux</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="1000" 
                        step="1"
                        value={localLight} 
                        onChange={handleSlider}
                        style={{ width: '80px', height: '4px', cursor: 'pointer' }}
                    />
                </div>
            )}
        </div>
    );
};
