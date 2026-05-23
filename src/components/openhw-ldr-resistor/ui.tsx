import React, { useMemo } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 60, h: 12 };

export const LDRResistorUI = ({ state, attrs }: { state: any; attrs: any }) => {
  const lux = state?.lux ?? parseFloat(attrs?.lux) ?? 100;
  const resistance = state?.resistance ?? 10000;
  const current = state?.current ?? 0;
  const voltage = state?.voltage ?? 0;

  // Color based on light intensity
  const getLuxColor = (): string => {
    if (lux < 10) return '#1a1a1a'; // Near black
    if (lux < 50) return '#333333'; // Very dark
    if (lux < 100) return '#555555'; // Dark
    if (lux < 500) return '#888888'; // Gray
    if (lux < 1000) return '#bbbbbb'; // Light gray
    return '#ffff00'; // Bright yellow for high lux
  };

  // Calculate glow intensity based on power dissipation
  const power = voltage * current / 1000; // Power in watts
  const glowIntensity = Math.min(1, power / 0.5); // Normalize to 0.5W max
  const glowOpacity = glowIntensity * 0.6;

  // Resistance display text
  const resistanceText = useMemo(() => {
    if (resistance >= 1000000) {
      return `${(resistance / 1000000).toFixed(1)}MΩ`;
    } else if (resistance >= 1000) {
      return `${(resistance / 1000).toFixed(1)}kΩ`;
    }
    return `${Math.round(resistance)}Ω`;
  }, [resistance]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: BOUNDS.w,
        height: BOUNDS.h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* SVG representation of resistor */}
      <svg
        width={BOUNDS.w}
        height={BOUNDS.h}
        viewBox={`0 0 ${BOUNDS.w} ${BOUNDS.h}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0
        }}
      >
        {/* Left terminal */}
        <line x1="0" y1="6" x2="12" y2="6" stroke="#ccc" strokeWidth="1" />

        {/* Resistor body (wavy or zigzag) */}
        <g>
          {/* Zigzag pattern */}
          <polyline
            points="12,4 16,8 20,4 24,8 28,4 32,8 36,4 40,8 44,4 48,8"
            stroke={getLuxColor()}
            strokeWidth="2"
            fill="none"
            style={{
              filter: glowIntensity > 0 ? `drop-shadow(0 0 ${glowIntensity * 4}px rgba(255,255,0,${glowOpacity}))` : 'none'
            }}
          />
        </g>

        {/* Right terminal */}
        <line x1="48" y1="6" x2="60" y2="6" stroke="#ccc" strokeWidth="1" />
      </svg>

      {/* Hover tooltip with values */}
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '4px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: '#fff',
          padding: '4px 8px',
          borderRadius: '3px',
          fontSize: '9px',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 1000,
          textShadow: '0 0 4px rgba(0, 0, 0, 0.8)',
          opacity: 0,
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = '0';
        }}
        title={`Lux: ${lux} | R: ${resistanceText}`}
      >
        <div>{resistanceText}</div>
        <div style={{ fontSize: '8px', color: '#aaa' }}>Lux: {Math.round(lux)}</div>
      </div>
    </div>
  );
};
