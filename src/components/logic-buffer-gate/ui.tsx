import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 60, h: 30 };

export const BufferGateUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const gateColor = '#a855f7';
    const wireColor = '#1e1e1e';

    return (
        <svg width="60" height="30" viewBox="0 0 60 30" style={{ pointerEvents: 'none' }}>
            {/* Input wire */}
            <line x1="0" y1="15" x2="15" y2="15" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />

            {/* Triangle body */}
            <defs>
                <linearGradient id="bufferGateFill" x1="15" y1="5" x2="45" y2="15" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
                </linearGradient>
            </defs>
            <polygon
                points="15,5 45,15 15,25"
                fill="url(#bufferGateFill)"
                stroke={gateColor}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
            />

            {/* Output wire */}
            <line x1="45" y1="15" x2="60" y2="15" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
};
