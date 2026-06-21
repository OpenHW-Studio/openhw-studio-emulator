import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 99, h: 75 };

export const RotaryEncoderUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const rot = state?.rot || 0;
    const pressed = state?.sw || false;
    const lastAngle = React.useRef<number | null>(null);

    const handleRotate = (e: React.PointerEvent) => {
        if (!attrs.onInteract || lastAngle.current === null) return;

        const rect = e.currentTarget.getBoundingClientRect();
        // The knob center is at x=60 in a 99px wide box.
        const cx = rect.left + (rect.width * (60 / 99)); 
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);

        let diff = angle - lastAngle.current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        if (Math.abs(diff) > 15) { // Threshold for one 'click'
            if (diff > 0) attrs.onInteract('rotate-cw');
            else attrs.onInteract('rotate-ccw');
            lastAngle.current = angle;
        }
    };

    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, cursor: isRunning ? 'pointer' : 'default' }}>
            <svg
                width="100%" height="100%" viewBox="0 0 99 75"
                style={{ 
                    pointerEvents: isRunning ? 'auto' : 'none',
                    display: 'block'
                }}
                onPointerDown={(e) => {
                    if (!isRunning) return;
                    e.stopPropagation();
                    e.preventDefault();

                    const rect = e.currentTarget.getBoundingClientRect();
                    const cx = rect.left + (rect.width * (60 / 99));
                    const cy = rect.top + rect.height / 2;
                    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
                    
                    const ratio = 99 / rect.width;
                    const svgDist = dist * ratio;

                    if (svgDist < 14) { // Center button click (radius < 14)
                        if (attrs.onInteract) attrs.onInteract('press');
                        (e.currentTarget as any).setPointerCapture(e.pointerId);
                    } else { // Knob rotation start
                        lastAngle.current = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
                        (e.currentTarget as any).setPointerCapture(e.pointerId);
                    }
                }}
                onPointerMove={(e) => {
                    e.stopPropagation();
                    if (lastAngle.current !== null) {
                        e.preventDefault();
                        handleRotate(e);
                    }
                }}
                onPointerUp={(e) => {
                    e.stopPropagation();
                    if (attrs.onInteract) attrs.onInteract('release');
                    lastAngle.current = null;
                }}
                onPointerCancel={(e) => {
                    e.stopPropagation();
                    lastAngle.current = null;
                }}
            >
                {/* PCB Base */}
                <rect x="0" y="0" width="99" height="75" rx="4" fill="#064e3b" stroke="#047857" strokeWidth="1" />
                <rect x="2" y="2" width="95" height="71" rx="3" fill="none" stroke="#34d399" strokeWidth="0.5" opacity="0.4" />

                {/* Pull-up Resistors */}
                <g transform="translate(25, 20)">
                    <rect x="0" y="0" width="4" height="6" fill="#111" />
                    <rect x="0" y="0" width="4" height="1.5" fill="#94a3b8" />
                    <rect x="0" y="4.5" width="4" height="1.5" fill="#94a3b8" />
                    <text x="2" y="4" fontSize="1.8" fill="#fff" textAnchor="middle" transform="rotate(-90 2 3)">103</text>
                </g>
                <g transform="translate(32, 20)">
                    <rect x="0" y="0" width="4" height="6" fill="#111" />
                    <rect x="0" y="0" width="4" height="1.5" fill="#94a3b8" />
                    <rect x="0" y="4.5" width="4" height="1.5" fill="#94a3b8" />
                    <text x="2" y="4" fontSize="1.8" fill="#fff" textAnchor="middle" transform="rotate(-90 2 3)">103</text>
                </g>
                <g transform="translate(25, 30)">
                    <rect x="0" y="0" width="4" height="6" fill="#111" />
                    <rect x="0" y="0" width="4" height="1.5" fill="#94a3b8" />
                    <rect x="0" y="4.5" width="4" height="1.5" fill="#94a3b8" />
                    <text x="2" y="4" fontSize="1.8" fill="#fff" textAnchor="middle" transform="rotate(-90 2 3)">103</text>
                </g>

                {/* Encoder Metal Base */}
                <g transform="translate(40, 17.5)">
                    <rect x="0" y="0" width="40" height="40" rx="2" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
                    <circle cx="4" cy="4" r="1.5" fill="#e2e8f0" />
                    <circle cx="36" cy="4" r="1.5" fill="#e2e8f0" />
                    <circle cx="4" cy="36" r="1.5" fill="#e2e8f0" />
                    <circle cx="36" cy="36" r="1.5" fill="#e2e8f0" />
                    <circle cx="20" cy="20" r="15" fill="#cbd5e1" stroke="#94a3b8" />
                    <circle cx="20" cy="20" r="12" fill="#e2e8f0" stroke="#cbd5e1" />
                </g>

                {/* Rotating Knob */}
                <g transform={`rotate(${rot}, 60, 37.5)`}>
                    <circle cx="60" cy="37.5" r="18" fill="#1f2937" stroke="#111" strokeWidth="1" />
                    {Array.from({ length: 24 }).map((_, i) => (
                        <line key={i} x1="60" y1="19.5" x2="60" y2="23" stroke="#4b5563" strokeWidth="1.5" transform={`rotate(${i * 15}, 60, 37.5)`} />
                    ))}
                    <circle cx="60" cy="37.5" r="14" fill={pressed ? "#374151" : "#4b5563"} />
                    <circle cx="60" cy="26" r="2.5" fill="#ef4444" />
                </g>

                {/* Pins and Labels */}
                {['CLK', 'DT', 'SW', 'VCC', 'GND'].map((l, i) => (
                    <g key={l}>
                        <circle cx="7.5" cy={7.5 + i * 15} r="4" fill="#ca8a04" />
                        <circle cx="7.5" cy={7.5 + i * 15} r="3" fill="#fef08a" />
                        <circle cx="7.5" cy={7.5 + i * 15} r="1.5" fill="#111" />
                        <text x="14" y={7.5 + i * 15 + 1.5} fontSize="4.5" fill="#fff" fontFamily="monospace" fontWeight="bold">{l}</text>
                    </g>
                ))}
            </svg>
        </div>
    );
};
