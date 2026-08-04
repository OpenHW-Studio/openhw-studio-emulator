import React from 'react'

export const BOUNDS = { x: 0, y: 0, w: 105, h: 270 }

export const HP4067UI = ({ state }: { state: any }) => {
    const active = typeof state?.activeChannel === 'number' ? state.activeChannel : -1;

    // Grid constants
    const leftX = 15;
    const rightX = 90;
    const startY = 15;
    const step = 15;
    const totalC = 16;

    const yOfC = (index: number) => startY + (totalC - 1 - index) * step;

    const leftPins = Array.from({ length: totalC }, (_, i) => ({
        label: `C${i}`,
        x: leftX,
        y: yOfC(i),
        channel: i,
    }));

    const rightPins = [
        { label: 'GND', y: yOfC(15), x: rightX },
        { label: 'VCC', y: yOfC(14), x: rightX },
        { label: 'EN',  y: yOfC(13), x: rightX },
        { label: 'S3',  y: yOfC(10), x: rightX },
        { label: 'S2',  y: yOfC(9),  x: rightX },
        { label: 'S1',  y: yOfC(8),  x: rightX },
        { label: 'S0',  y: yOfC(7),  x: rightX },
        { label: 'SIG', y: yOfC(0),  x: rightX },
    ];

    return (
        <div style={{
            pointerEvents: 'none',
            width: BOUNDS.w,
            height: BOUNDS.h,
            position: 'relative'
        }}>
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 105 270"
                style={{ display: 'block' }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="hp4067_pcb" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#4c1d95" />
                        <stop offset="100%" stopColor="#2e1065" />
                    </linearGradient>
                    <filter id="activeGlow">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* PCB Base */}
                <rect x="0" y="0" width="105" height="270" rx="4" fill="url(#hp4067_pcb)" stroke="#3b0764" strokeWidth="1" />
                <rect x="2" y="2" width="101" height="266" rx="3" fill="none" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.4" />
                
                {/* Subtle texture / Traces */}
                <path d="M 15 15 L 25 15 L 40 85" fill="none" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.3" />
                <path d="M 15 240 L 25 240 L 40 185" fill="none" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.3" />
                <path d="M 90 240 L 80 240 L 65 185" fill="none" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.3" />
                <path d="M 90 15 L 80 15 L 65 85" fill="none" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.3" />

                {/* Mounting Holes */}
                <circle cx="52.5" cy="15" r="4" fill="#000" opacity="0.5" />
                <circle cx="52.5" cy="15" r="3" fill="#fff" opacity="0.8" />
                <circle cx="52.5" cy="15" r="2.5" fill="#111" />
                
                <circle cx="52.5" cy="255" r="4" fill="#000" opacity="0.5" />
                <circle cx="52.5" cy="255" r="3" fill="#fff" opacity="0.8" />
                <circle cx="52.5" cy="255" r="2.5" fill="#111" />

                {/* SMD Capacitors */}
                <g transform="translate(65, 45)">
                    <rect x="0" y="0" width="4" height="6" fill="#b45309" />
                    <rect x="0" y="0" width="4" height="1" fill="#9ca3af" />
                    <rect x="0" y="5" width="4" height="1" fill="#9ca3af" />
                </g>
                <g transform="translate(35, 45)">
                    <rect x="0" y="0" width="4" height="6" fill="#b45309" />
                    <rect x="0" y="0" width="4" height="1" fill="#9ca3af" />
                    <rect x="0" y="5" width="4" height="1" fill="#9ca3af" />
                </g>

                {/* Main IC (SOP24 style representation) */}
                <g transform="translate(40, 75)">
                    {/* IC Shadow */}
                    <rect x="2" y="2" width="25" height="120" rx="1.5" fill="#000" opacity="0.5" />
                    {/* Silver IC Pads / Leads */}
                    {Array.from({ length: 12 }).map((_, i) => (
                        <g key={`lead-${i}`}>
                            <rect x="-3" y={8 + i * 9} width="4" height="2" fill="#cbd5e1" />
                            <rect x="24" y={8 + i * 9} width="4" height="2" fill="#cbd5e1" />
                        </g>
                    ))}
                    {/* IC Body */}
                    <rect x="0" y="0" width="25" height="120" rx="1.5" fill="#111827" stroke="#0f172a" strokeWidth="1" />
                    {/* IC Reflection */}
                    <rect x="1" y="1" width="23" height="118" rx="1" fill="none" stroke="#334155" strokeWidth="0.5" />
                    
                    {/* Pin 1 Indicator */}
                    <circle cx="5" cy="6" r="2" fill="#1e293b" />
                    
                    {/* IC Branding */}
                    <g transform="translate(12.5, 60) rotate(-90)">
                        <text x="0" y="-3" fill="#64748b" fontSize="6" fontWeight="bold" textAnchor="middle">CD74HC4067</text>
                        <text x="0" y="4" fill="#475569" fontSize="4" textAnchor="middle">ANALOG MUX</text>
                    </g>
                </g>

                {/* Left Pins & Labels */}
                {leftPins.map((p) => {
                    const isActive = active === p.channel;
                    return (
                        <g key={p.label}>
                            {/* Gold Pad */}
                            <circle cx={p.x} cy={p.y} r="4" fill="#ca8a04" />
                            <circle cx={p.x} cy={p.y} r="3" fill="#fef08a" />
                            <circle cx={p.x} cy={p.y} r="1.8" fill="#111" />
                            {/* Label */}
                            <text x={p.x + 8} y={p.y + 1.5} fill="#fff" fontSize="5" fontWeight="bold" fontFamily="monospace" textAnchor="start">{p.label}</text>
                            
                            {/* LED Indicator for Active Channel */}
                            {isActive && (
                                <g transform={`translate(${p.x + 22}, ${p.y})`}>
                                    <circle cx="0" cy="0" r="1.5" fill="#4ade80" filter="url(#activeGlow)" />
                                </g>
                            )}
                        </g>
                    );
                })}

                {/* Right Pins & Labels */}
                {rightPins.map((p) => (
                    <g key={p.label}>
                        {/* Gold Pad */}
                        <circle cx={p.x} cy={p.y} r="4" fill="#ca8a04" />
                        <circle cx={p.x} cy={p.y} r="3" fill="#fef08a" />
                        <circle cx={p.x} cy={p.y} r="1.8" fill="#111" />
                        {/* Label */}
                        <text x={p.x - 8} y={p.y + 1.5} fill="#fff" fontSize="5" fontWeight="bold" fontFamily="monospace" textAnchor="end">{p.label}</text>
                    </g>
                ))}

                {/* Branding / Text */}
                <text x="52.5" y="265" fill="#e2e8f0" fontSize="5" fontWeight="bold" textAnchor="middle" opacity="0.8">16-Channel Mux</text>
            </svg>
        </div>
    );
};
