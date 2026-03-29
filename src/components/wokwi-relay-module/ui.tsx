import React from 'react';

// Keeping the larger 200x80 bounds
export const BOUNDS = { x: 0, y: 0, w: 200, h: 80 };

export const RelayModuleContextMenu = ({
    attrs,
    onUpdate,
}: {
    attrs: any;
    onUpdate: (key: string, value: any) => void;
}) => (
    <>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Trigger Level:</span>
        <select
            value={attrs?.triggerLevel ?? 'low'}
            onChange={e => onUpdate('triggerLevel', e.target.value)}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        >
            <option value="low">Active LOW (default)</option>
            <option value="high">Active HIGH</option>
        </select>
    </>
);

export const RelayModuleUI = ({
    state,
    attrs,
}: {
    state: any;
    attrs: any;
}) => {
    const energised = state?.energised ?? false;

    return (
        <div style={{ position: 'relative', width: 200, height: 80 }}>
            <svg width="200" height="80" viewBox="0 0 100 40" style={{ fontFamily: 'sans-serif' }}>
                {/* PCB Base */}
                <rect x="0" y="0" width="94" height="40" rx="1.5" fill="#002b5e" />
                <rect x="0" y="0" width="94" height="40" rx="1.5" fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1" />

                {/* Left Terminal Block */}
                <rect x="0" y="2" width="14" height="36" rx="1" fill="#0a5eb0" stroke="#063b73" strokeWidth="0.5" />
                <path d="M 0 14 L 14 14 M 0 26 L 14 26" stroke="#063b73" strokeWidth="0.5" />
                
                {/* Screws */}
                <circle cx="7" cy="8" r="3.5" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
                <line x1="4.5" y1="8" x2="9.5" y2="8" stroke="#4b5563" strokeWidth="1" />
                <circle cx="7" cy="20" r="3.5" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
                <line x1="5" y1="18" x2="9" y2="22" stroke="#4b5563" strokeWidth="1" />
                <circle cx="7" cy="32" r="3.5" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
                <line x1="5" y1="34" x2="9" y2="30" stroke="#4b5563" strokeWidth="1" />

                {/* Silkscreen Left */}
                <text x="15.5" y="9.5" fill="#ffffff" fontSize="3.5" fontWeight="bold">NO</text>
                <text x="15.5" y="21.5" fill="#ffffff" fontSize="3.5" fontWeight="bold">COM</text>
                <text x="15.5" y="33.5" fill="#ffffff" fontSize="3.5" fontWeight="bold">NC</text>

                {/* Relay Component */}
                <rect x="26" y="2" width="40" height="36" rx="1" fill="#0a5eb0" stroke="#063b73" strokeWidth="0.5" />
                
                {/* Relay Text */}
                <text x="46" y="14" fill="#ffffff" fontSize="3.5" textAnchor="middle">JQC3F-5VDC-C</text>
                <text x="46" y="24" fill="#ffffff" fontSize="2.5" textAnchor="middle">10A 250VAC 10A 30VDC</text>
                <text x="46" y="30" fill="#ffffff" fontSize="2.5" textAnchor="middle">10A 125VAC 10A 28VDC</text>

                {/* Decorative SMD Components */}
                <rect x="69" y="16" width="2.5" height="4" fill="#111" />
                <rect x="73" y="16" width="2.5" height="4" fill="#111" />
                <rect x="69" y="22" width="2.5" height="4" fill="#111" />
                <rect x="73" y="23" width="3" height="2" fill="#222" />
                <line x1="75.5" y1="23" x2="75.5" y2="25" stroke="#9ca3af" strokeWidth="0.5" />

                {/* LEDs */}
                {/* Power LED (Red) - Moved to TOP near IN */}
                <circle cx="80" cy="10" r="2.5" fill="#ef4444" />
                <circle cx="80" cy="10" r="1" fill="#fca5a5" />

                {/* Status LED (Green) - Moved to BOTTOM near VCC. Toggles based on energised state. */}
                <circle cx="80" cy="30" r="2.5" fill={energised ? '#22c55e' : '#14532d'} />
                <circle cx="80" cy="30" r="1" fill={energised ? '#bbf7d0' : '#052e16'} />

                {/* Silkscreen Right */}
                <text x="85" y="10.5" fill="#ffffff" fontSize="3.5" fontWeight="bold" textAnchor="end">IN</text>
                <text x="85" y="21.5" fill="#ffffff" fontSize="3.5" fontWeight="bold" textAnchor="end">GND</text>
                <text x="85" y="32.5" fill="#ffffff" fontSize="3.5" fontWeight="bold" textAnchor="end">VCC</text>

                {/* Pin Header Base */}
                <rect x="87" y="6" width="3" height="28" rx="0.5" fill="#1a1a1a" />

                {/* Right Pins */}
                <rect x="90" y="8.75" width="10" height="1.5" fill="#fbbf24" stroke="#d97706" strokeWidth="0.25" />
                <rect x="90" y="19.75" width="10" height="1.5" fill="#fbbf24" stroke="#d97706" strokeWidth="0.25" />
                <rect x="90" y="30.75" width="10" height="1.5" fill="#fbbf24" stroke="#d97706" strokeWidth="0.25" />
            </svg>
        </div>
    );
};