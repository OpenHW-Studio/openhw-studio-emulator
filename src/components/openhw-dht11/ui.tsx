import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 75, h: 60 };

export const DHT11ContextMenu = ({ attrs, onUpdate }: { attrs: any; onUpdate: (key: string, value: any) => void }) => (
    <>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Temp (°C):</span>
        <input
            type="number" value={attrs?.temperature ?? '25'} step="1"
            onChange={e => onUpdate('temperature', e.target.value)}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        />
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Humidity (%):</span>
        <input
            type="number" value={attrs?.humidity ?? '50'} step="1"
            onChange={e => onUpdate('humidity', e.target.value)}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        />
    </>
);

export const DHT11UI = ({ state, attrs, onEvent, isRunning }: { state: any; attrs: any; onEvent?: (event: any) => void, isRunning?: boolean }) => {
    const temp = state?.temperature ?? attrs?.temperature ?? 25;
    const hum = state?.humidity ?? attrs?.humidity ?? 50;

    const handleTempSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (onEvent) onEvent({ type: 'temperature', value: e.target.value });
    };

    const handleHumSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (onEvent) onEvent({ type: 'humidity', value: e.target.value });
    };

    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
            <svg width={BOUNDS.w} height={BOUNDS.h} viewBox="0 0 75 60" style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
                {/* 4 Pins */}
                <path d="M 15 35 L 15 60" stroke="#bdc3c7" strokeWidth="2" />
                <path d="M 30 35 L 30 60" stroke="#bdc3c7" strokeWidth="2" />
                <path d="M 45 35 L 45 60" stroke="#bdc3c7" strokeWidth="2" />
                <path d="M 60 35 L 60 60" stroke="#bdc3c7" strokeWidth="2" />

                {/* Blue Body */}
                <rect x="7.5" y="0" width="60" height="35" fill="#3498db" rx="2" />
                
                {/* Grid Pattern */}
                <rect x="7.5" y="0" width="60" height="35" fill="url(#dht11Grid4Pin)" rx="2" />
                <defs>
                    <pattern id="dht11Grid4Pin" width="10" height="10" patternUnits="userSpaceOnUse">
                        <rect width="10" height="10" fill="none" stroke="#2980b9" strokeWidth="0.5" />
                        <rect x="2.5" y="2.5" width="5" height="5" fill="#1a5276" rx="1.5" />
                    </pattern>
                </defs>
            </svg>

            {/* In-simulation interactive sliders */}
            {isRunning && (
                <div style={{ 
                    position: 'absolute', 
                    top: '-70px', 
                    left: '-15px',
                    background: 'rgba(0,0,0,0.85)', 
                    padding: '8px', 
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    pointerEvents: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
                onMouseDown={(e) => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>Temp</span>
                        <span>{temp}°C</span>
                    </div>
                    <input 
                        type="range" min="0" max="50" value={temp} 
                        onChange={handleTempSlider}
                        style={{ width: '80px', height: '4px', cursor: 'pointer' }}
                    />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '4px' }}>
                        <span>Hum</span>
                        <span>{hum}%</span>
                    </div>
                    <input 
                        type="range" min="20" max="90" value={hum} 
                        onChange={handleHumSlider}
                        style={{ width: '80px', height: '4px', cursor: 'pointer' }}
                    />
                </div>
            )}
        </div>
    );
};
