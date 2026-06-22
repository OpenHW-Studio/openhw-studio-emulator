import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 65.3, h: 65.3 };

const lightColors: Record<string, string> = {
  red: '#ff8080',
  green: '#80ff80',
  blue: '#8080ff',
  yellow: '#ffff80',
  orange: '#ffcf80',
  white: '#ffffff',
  purple: '#ff80ff',
};

const LED_SVG = ({ color, brightness, illuminated }: { color: string; brightness: number; illuminated: boolean }) => {
    const b = Math.max(0, Math.min(1, brightness / 255));
    const lightOn = illuminated && b > Number.EPSILON;
    const lightColorActual = lightColors[color?.toLowerCase()] || color;
    const opacity = b ? 0.3 + b * 0.7 : 0;

    return (
        <svg width="100%" height="100%" viewBox="0 0 24 35" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="glow1" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" />
                </filter>
                <filter id="glow2" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" />
                </filter>
            </defs>

            {/* LED leads */}
            <rect x="9.5" y="24" width="2" height="11" fill="#aaa" />
            <rect x="14" y="24" width="2" height="11" fill="#aaa" />

            {/* Flat spot / cathode mark */}
            <rect x="3.5" y="18.5" width="2" height="8" fill="#8c8c8c" />

            {/* LED base / inner lead frame visible through dome */}
            <path d="M 12 18 L 9 24 L 5.5 24 L 3.5 18.5 L 2.5 14.5 L 21.5 14.5 L 20.5 18.5 L 18.5 24 L 15 24 Z" fill="#8c8c8c" opacity="0.6" />

            {/* LED dome casing - layered for 3D effect */}
            <ellipse cx="12" cy="10" rx="10" ry="12" fill="#d1d1d1" opacity="0.9" />
            <ellipse cx="12" cy="10" rx="10" ry="12" fill="#e6e6e6" opacity="0.5" />

            {/* LED dome - colored overlay */}
            <ellipse cx="12" cy="10" rx="10" ry="12" fill={color} opacity="0.65" />

            {/* White reflector highlight */}
            <ellipse cx="9" cy="7" rx="3" ry="4" fill="white" opacity="0.4" />
            <ellipse cx="9" cy="7" rx="1.5" ry="2" fill="white" opacity="0.6" />

            {/* Inner reflector detail lines */}
            <path d="M 12 10 L 5.5 14 L 18.5 14 Z" fill="none" stroke="#666" strokeWidth="0.5" opacity="0.3" />
            <path d="M 12 10 L 2.5 14 L 21.5 14 Z" fill="none" stroke="#666" strokeWidth="0.5" opacity="0.2" />

            {/* Glow when lit */}
            {lightOn && (
                <g>
                    <ellipse cx="12" cy="9" rx="14" ry="14" fill={lightColorActual} filter="url(#glow2)" opacity={opacity} />
                    <ellipse cx="12" cy="9" rx="3" ry="3" fill="white" filter="url(#glow1)" />
                    <ellipse cx="12" cy="9" rx="5" ry="5" fill="white" filter="url(#glow1)" opacity={opacity} />
                </g>
            )}
        </svg>
    );
};

export const LEDUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const brightness = state?.brightness ?? 0;
    const color = attrs?.color || 'red';
    const illuminated = state?.illuminated ?? false;

    return (
        <div style={{
            width: BOUNDS.w,
            height: BOUNDS.h,
            pointerEvents: 'none'
        }}>
            <LED_SVG color={color} brightness={brightness} illuminated={illuminated} />
        </div>
    );
};
