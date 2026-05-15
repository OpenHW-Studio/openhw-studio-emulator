import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 75, h: 75 };

export const StepperMotorUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const angle = state?.angle ?? 0;

    const nativeW = 50;
    const nativeH = 50;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    return (
        <div style={{
            pointerEvents: 'none',
            width: BOUNDS.w,
            height: BOUNDS.h,
            position: 'relative'
        }}>
            <svg
                width={nativeW}
                height={nativeH}
                viewBox="0 0 50 50"
                style={{
                    display: 'block',
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '0 0'
                }}
            >
                <rect width="50" height="50" fill="#bdc3c7" rx="5" />
                <circle cx="25" cy="25" r="20" fill="#7f8c8d" />

                <g transform={`rotate(${angle}, 25, 25)`} style={{ transition: 'transform 0.05s linear' }}>
                    <circle cx="25" cy="25" r="8" fill="#95a5a6" />
                    <circle cx="25" cy="25" r="3" fill="#2c3e50" />
                    <line x1="25" y1="25" x2="25" y2="10" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" />
                </g>

                {/* Pins */}
                <circle cx="10" cy="50" r="2.5" fill="#34495e" />
                <circle cx="20" cy="50" r="2.5" fill="#34495e" />
                <circle cx="30" cy="50" r="2.5" fill="#34495e" />
                <circle cx="40" cy="50" r="2.5" fill="#34495e" />
            </svg>
        </div>
    );
};
