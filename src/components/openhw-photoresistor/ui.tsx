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
    // Safely parse lux
    let rawLux = state?.lux ?? attrs?.lux ?? 500;
    let lux = typeof rawLux === 'number' ? rawLux : parseFloat(String(rawLux));
    if (isNaN(lux)) lux = 500;

    const luxRatio = Math.max(0, Math.min(1, lux / 1000));

    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, pointerEvents: 'none' }}>
            <svg 
                width="100%" height="100%" viewBox="0 0 22.5 22.5" 
                style={{ display: 'block', overflow: 'visible' }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <radialGradient id="epoxy" cx="40%" cy="30%" r="60%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
                        <stop offset="40%" stopColor="rgba(255,255,255,0.1)" />
                        <stop offset="80%" stopColor="rgba(0,0,0,0.15)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.3)" />
                    </radialGradient>
                    
                    <linearGradient id="legMetal" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#9CA3AF" />
                        <stop offset="50%" stopColor="#F3F4F6" />
                        <stop offset="100%" stopColor="#6B7280" />
                    </linearGradient>

                    <radialGradient id="luxGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(241, 196, 15, 0.5)" />
                        <stop offset="50%" stopColor="rgba(241, 196, 15, 0.2)" />
                        <stop offset="100%" stopColor="rgba(241, 196, 15, 0)" />
                    </radialGradient>
                    
                    <filter id="trackShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0.2" stdDeviation="0.2" floodColor="#000" floodOpacity="0.4" />
                    </filter>
                </defs>

                {/* Metallic Legs curving to the 15px pitch anchor points */}
                <path d="M 8.5 13 L 8.5 17 Q 8.5 20 3.75 22.5" fill="none" stroke="url(#legMetal)" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M 14 13 L 14 17 Q 14 20 18.75 22.5" fill="none" stroke="url(#legMetal)" strokeWidth="1.2" strokeLinecap="round" />

                {/* Connection points exactly at y=22.5 */}
                <circle cx="3.75" cy="22.5" r="1.5" fill="#333" />
                <circle cx="18.75" cy="22.5" r="1.5" fill="#333" />

                {/* Ambient Lux Glow - placed behind the sensor head to act as a halo */}
                {luxRatio > 0 && (
                    <circle cx="11.25" cy="7" r={8 + (luxRatio * 6)} fill="url(#luxGlow)" opacity={luxRatio} style={{ mixBlendMode: 'screen' }} />
                )}

                {/* LDR Head */}
                <g transform="translate(11.25, 7)">
                    {/* Ceramic Base */}
                    <circle r="5.5" fill="#E8DCC4" stroke="#D1BFAE" strokeWidth="0.4" />
                    
                    {/* Electrodes (Metallic Silver Base) */}
                    <circle r="4.8" fill="url(#legMetal)" />
                    
                    {/* CdS Interdigitated Track (Orange Serpentine) */}
                    <path d="
                        M -3.5 -3.5 
                        L 3.5 -3.5 A 0.5 0.5 0 0 1 3.5 -2.5
                        L -3.5 -2.5 A 0.5 0.5 0 0 0 -3.5 -1.5
                        L 3.5 -1.5 A 0.5 0.5 0 0 1 3.5 -0.5
                        L -3.5 -0.5 A 0.5 0.5 0 0 0 -3.5 0.5
                        L 3.5 0.5 A 0.5 0.5 0 0 1 3.5 1.5
                        L -3.5 1.5 A 0.5 0.5 0 0 0 -3.5 2.5
                        L 3.5 2.5 A 0.5 0.5 0 0 1 3.5 3.5
                        L -3.5 3.5
                    " fill="none" stroke="#D35400" strokeWidth="0.5" filter="url(#trackShadow)" />
                    
                    {/* Glossy Clear Epoxy Dome Coating */}
                    <circle r="5.5" fill="url(#epoxy)" />
                </g>
            </svg>
        </div>
    );
};

export const BOUNDS = { x: 0, y: 0, w: 22.5, h: 22.5 };
