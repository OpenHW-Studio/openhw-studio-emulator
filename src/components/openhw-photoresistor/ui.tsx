import React from 'react';

export const PhotoresistorContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => {
    const lux = attrs?.lux ?? 500;

    const handleSlider = (key: string, value: number) => {
        onUpdate(key, value);
        if (attrs && attrs.onInteract) {
            attrs.onInteract({ type: 'SET_ATTR', key, value });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }} data-contextmenu="true">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '10px', color: 'var(--text2)', marginBottom: '2px' }}>Lux: {lux} lx</label>
                <input 
                    type="range" min="0" max="1000" value={lux}
                    onChange={(e) => handleSlider('lux', parseFloat(e.target.value))}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{ width: '80px', cursor: 'pointer' }}
                />
            </div>
        </div>
    );
};

export const PhotoresistorUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    // Safely parse lux to ensure we don't get NaN rendering issues
    let rawLux = state?.lux ?? attrs?.lux ?? 500;
    let lux = typeof rawLux === 'number' ? rawLux : parseFloat(String(rawLux));
    if (isNaN(lux)) lux = 500;

    const luxRatio = Math.max(0, Math.min(1, lux / 1000));

    const nativeW = 30;
    const nativeH = 30;
    const scale = BOUNDS.w / nativeW;

    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, pointerEvents: 'none' }}>
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
                    <radialGradient id="ceramicGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" style={{ stopColor: '#f9f9f9', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#e0e0e0', stopOpacity: 1 }} />
                    </radialGradient>
                    <linearGradient id="pinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: '#bdc3c7', stopOpacity: 1 }} />
                        <stop offset="50%" style={{ stopColor: '#ecf0f1', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#95a5a6', stopOpacity: 1 }} />
                    </linearGradient>
                </defs>

                {/* Pins */}
                <rect x="4" y="15" width="2" height="15" fill="url(#pinGrad)" />
                <rect x="24" y="15" width="2" height="15" fill="url(#pinGrad)" />

                {/* Ambient Light Overlay */}
                <circle cx="15" cy="15" r="14" fill="#f1c40f" opacity={luxRatio * 0.3} style={{ mixBlendMode: 'screen' }} />

                {/* Ceramic Substrate */}
                <circle cx="15" cy="15" r="10" fill="url(#ceramicGrad)" stroke="#bdc3c7" strokeWidth="0.5" />
                <circle cx="15" cy="15" r="8" fill="none" stroke="#dcdde1" strokeWidth="1" strokeDasharray="1,1" />

                {/* Light reflection on substrate depending on lux */}
                <circle cx="15" cy="15" r="10" fill="#f1c40f" opacity={luxRatio * 0.25} />

                {/* CdS Zigzag Track */}
                <path 
                    d="M 10 12 L 20 12 L 10 14 L 20 14 L 10 16 L 20 16 L 10 18 L 20 18" 
                    fill="none" 
                    stroke={`hsl(30, 100%, ${30 + luxRatio * 40}%)`} 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                />
                
                {/* Metallic Electrodes */}
                <path d="M 8 10 L 12 10" stroke="#7f8c8d" strokeWidth="2" strokeLinecap="round" />
                <path d="M 18 20 L 22 20" stroke="#7f8c8d" strokeWidth="2" strokeLinecap="round" />
            </svg>
        </div>
    );
};

export const BOUNDS = { x: 0, y: 0, w: 22.5, h: 22.5 };
