import React from 'react';

// Bounding box for the blue selection ring.
// x, y: offset from comp.x/comp.y (top-left corner of the visual area)
// w, h: width and height of the visual area
export const BOUNDS = { x: 0, y: 0, w: 60, h: 12 };

export const ResistorUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const value = attrs?.value || '220';

    return (
        <div style={{ position: 'relative', width: 60, height: 12, pointerEvents: 'none' }}>
            <svg width="60" height="12" viewBox="0 0 60 12" style={{ display: 'block', overflow: 'visible' }} xmlns="http://www.w3.org/2000/svg">
                <line x1="0" y1="10" x2="14" y2="10" stroke="#b8b8b8" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="46" y1="10" x2="60" y2="10" stroke="#b8b8b8" strokeWidth="2.2" strokeLinecap="round" />
                <rect x="14" y="4" width="32" height="10" rx="4" fill="#d9c48f" stroke="#8a6f35" strokeWidth="0.8" />
                <line x1="22" y1="5" x2="22" y2="13" stroke="#8b5cf6" strokeWidth="2" />
                <line x1="28" y1="5" x2="28" y2="13" stroke="#ef4444" strokeWidth="2" />
                <line x1="34" y1="5" x2="34" y2="13" stroke="#92400e" strokeWidth="2" />
                <text x="30" y="2.5" fill="#475569" fontSize="5" textAnchor="middle">{value}</text>
            </svg>
        </div>
    );
};
