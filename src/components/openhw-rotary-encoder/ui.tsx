import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 99, h: 75 };

export const RotaryEncoderUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const rot = state?.rot || 0;
    const pressed = state?.sw || false;
    const lastAngle = React.useRef<number | null>(null);

    const nativeW = 66;
    const nativeH = 50;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    const handleRotate = (e: React.PointerEvent) => {
        if (!attrs.onInteract || lastAngle.current === null) return;

        const rect = e.currentTarget.getBoundingClientRect();
        // Scale the center coordinates as well
        const cx = rect.left + (rect.width * (46 / 66)); 
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
                width={nativeW} height={nativeH} viewBox="0 0 66 50"
                style={{ 
                    pointerEvents: isRunning ? 'auto' : 'none',
                    display: 'block',
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '0 0'
                }}
                onPointerDown={(e) => {
                    if (!isRunning) return;
                    e.stopPropagation();
                    e.preventDefault();

                    const rect = e.currentTarget.getBoundingClientRect();
                    const cx = rect.left + (rect.width * (46 / 66));
                    const cy = rect.top + rect.height / 2;
                    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);

                    if (dist < 8 * scaleX) { // Center button click (scaled threshold)
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
                <rect width="66" height="50" fill="#34495e" rx="4" />
                <circle cx="46" cy="25" r="16" fill="#bdc3c7" />

                <g transform={`rotate(${rot}, 46, 25)`}>
                    <circle cx="46" cy="25" r="14" fill={pressed ? "#95a5a6" : "#ecf0f1"} />
                    {/* Grip marks */}
                    {Array.from({ length: 12 }).map((_, i) => (
                        <line key={i} x1="46" y1="12" x2="46" y2="15" stroke="#7f8c8d" strokeWidth="1.5" transform={`rotate(${i * 30}, 46, 25)`} />
                    ))}
                </g>

                {/* Pins */}
                {['CLK', 'DT', 'SW', 'VCC', 'GND'].map((l, i) => (
                    <g key={l}>
                        <circle cx="5" cy={5 + i * 10} r="2" fill="#ecf0f1" />
                        <text x="9" y={6 + i * 10} fontSize="3" fill="white" style={{ fontWeight: 'bold' }}>{l}</text>
                    </g>
                ))}
            </svg>
        </div>
    );
};
