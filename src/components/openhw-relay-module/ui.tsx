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
            <svg width="200" height="80" viewBox="0 0 200 80" style={{ fontFamily: 'sans-serif' }}>
                {/* PCB Base */}
                <rect x="0" y="0" width="188" height="80" rx="3" fill="#002b5e" />
                <rect x="0" y="0" width="188" height="80" rx="3" fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1" />

                {/* Left Terminal Block */}
                <rect x="0" y="4" width="28" height="72" rx="2" fill="#0a5eb0" stroke="#063b73" strokeWidth="1" />
                
                {/* Screws at 25, 40, 55 */}
                <circle cx="14" cy="25" r="7" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1" />
                <line x1="9" y1="25" x2="19" y2="25" stroke="#4b5563" strokeWidth="2" />

                <circle cx="14" cy="40" r="7" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1" />
                <line x1="10" y1="36" x2="18" y2="44" stroke="#4b5563" strokeWidth="2" />

                <circle cx="14" cy="55" r="7" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1" />
                <line x1="10" y1="59" x2="18" y2="51" stroke="#4b5563" strokeWidth="2" />

                {/* Silkscreen Left */}
                <text x="32" y="28" fill="#ffffff" fontSize="7" fontWeight="bold">NO</text>
                <text x="32" y="43" fill="#ffffff" fontSize="7" fontWeight="bold">COM</text>
                <text x="32" y="58" fill="#ffffff" fontSize="7" fontWeight="bold">NC</text>

                {/* Relay Component */}
                <rect x="52" y="4" width="80" height="72" rx="2" fill="#0a5eb0" stroke="#063b73" strokeWidth="1" />
                
                {/* Decorative SMD Components */}
                <rect x="138" y="32" width="5" height="8" fill="#111" />
                <rect x="146" y="32" width="5" height="8" fill="#111" />

                {/* LEDs */}
                <circle cx="140" cy="16" r="4.4" fill="#ef4444" />
                <circle cx="140" cy="16" r="1.6" fill="#fca5a5" />

                <circle cx="140" cy="64" r="4.4" fill={energised ? '#22c55e' : '#14532d'} />
                <circle cx="140" cy="64" r="1.6" fill={energised ? '#bbf7d0' : '#052e16'} />

                {/* Silkscreen Right */}
                <text x="148" y="28" fill="#ffffff" fontSize="7" fontWeight="bold">IN</text>
                <text x="148" y="43" fill="#ffffff" fontSize="7" fontWeight="bold">GND</text>
                <text x="148" y="58" fill="#ffffff" fontSize="7" fontWeight="bold">VCC</text>

                {/* Pin Header Base & Connection Pads at 25, 40, 55 */}
                <rect x="184" y="8" width="6" height="64" rx="1" fill="#1a1a1a" />
                <circle cx="187" cy="25" r="2" fill="#fbbf24" />
                <circle cx="187" cy="40" r="2" fill="#fbbf24" />
                <circle cx="187" cy="55" r="2" fill="#fbbf24" />
            </svg>
        </div>
    );
};
