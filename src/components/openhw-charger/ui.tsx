import React from 'react';

export const ChargerContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => (
    <>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Charge Current (mA):</span>
        <select 
            value={attrs?.chargeCurrentMa || '1000'}
            onChange={e => onUpdate('chargeCurrentMa', e.target.value)}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        >
            <option value="100">100mA</option>
            <option value="500">500mA</option>
            <option value="1000">1000mA</option>
        </select>
    </>
);

export const BOUNDS = { x: 0, y: 0, w: 80, h: 50 };

export const ChargerUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const isCharging = state?.isCharging;
    const inputVoltage = state?.inputVoltage || 0;

    return (
        <div style={{
            width: BOUNDS.w,
            height: BOUNDS.h,
            pointerEvents: 'none',
            position: 'relative'
        }}>
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 80 50"
                style={{ display: 'block' }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="usbMetal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d1d5db" />
                        <stop offset="20%" stopColor="#f3f4f6" />
                        <stop offset="50%" stopColor="#9ca3af" />
                        <stop offset="80%" stopColor="#e5e7eb" />
                        <stop offset="100%" stopColor="#6b7280" />
                    </linearGradient>
                </defs>

                {/* PCB Base */}
                <rect x="1" y="2" width="63" height="36" rx="3" fill="#1e3a8a" stroke="#1e40af" strokeWidth="1" />
                <rect x="1" y="2" width="63" height="36" rx="3" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3" />

                {/* Copper Traces */}
                <path d="M 5 10 L 15 10 L 25 18 M 5 30 L 15 30 L 25 22 M 60 10 L 45 10 L 35 18 M 60 30 L 45 30 L 35 22" fill="none" stroke="#2563eb" strokeWidth="1.5" opacity="0.6" />

                {/* Micro USB Port */}
                <rect x="-1" y="16" width="10" height="8" rx="1" fill="url(#usbMetal)" stroke="#6b7280" strokeWidth="0.5" />
                <rect x="0" y="17" width="8" height="6" fill="#111" />
                <rect x="1" y="18" width="6" height="1" fill="#fcd34d" /> {/* USB contacts */}

                {/* TP4056 IC (SOP-8) */}
                <rect x="25" y="14" width="12" height="12" rx="1" fill="#111827" />
                <path d="M 23 15.5 h 2 m -2 3 h 2 m -2 3 h 2 m -2 3 h 2 M 37 15.5 h 2 m -2 3 h 2 m -2 3 h 2 m -2 3 h 2" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="square" />
                <circle cx="27" cy="16" r="0.6" fill="#374151" /> {/* Pin 1 indicator */}
                <text x="31" y="21.5" fill="#4b5563" fontSize="2.5" fontWeight="bold" textAnchor="middle" transform="rotate(-90 31 21.5)">TP4056</text>

                {/* Battery Protection IC (DW01A) */}
                <rect x="42" y="17" width="6" height="6" rx="0.5" fill="#111827" />
                <path d="M 41 18 h 1 m -1 2 h 1 m -1 2 h 1 M 48 18 h 1 m -1 2 h 1 m -1 2 h 1" stroke="#9ca3af" strokeWidth="0.8" />
                
                {/* Dual Mosfet (8205A) */}
                <rect x="42" y="26" width="6" height="6" rx="0.5" fill="#111827" />
                <path d="M 41 27 h 1 m -1 2 h 1 m -1 2 h 1 M 48 27 h 1 m -1 2 h 1 m -1 2 h 1" stroke="#9ca3af" strokeWidth="0.8" />

                {/* Resistors & Capacitors (SMD) */}
                {/* RPROG */}
                <rect x="18" y="7" width="4" height="2" fill="#111" />
                <rect x="17.5" y="7" width="0.8" height="2" fill="#9ca3af" />
                <rect x="21.7" y="7" width="0.8" height="2" fill="#9ca3af" />
                
                {/* Ceramic Caps */}
                <rect x="18" y="31" width="4" height="2" fill="#b45309" />
                <rect x="17.5" y="31" width="0.8" height="2" fill="#9ca3af" />
                <rect x="21.7" y="31" width="0.8" height="2" fill="#9ca3af" />
                
                <rect x="52" y="19" width="3" height="5" fill="#b45309" />
                <rect x="52" y="18.5" width="3" height="0.8" fill="#9ca3af" />
                <rect x="52" y="23.7" width="3" height="0.8" fill="#9ca3af" />

                {/* LEDs */}
                {/* Red (Charging) */}
                <rect x="28" y="6" width="3" height="2" fill={isCharging ? '#ef4444' : '#7f1d1d'} />
                <circle cx="29.5" cy="7" r="2" fill={isCharging ? '#ef4444' : 'transparent'} style={{ filter: isCharging ? 'drop-shadow(0 0 3px #ef4444)' : 'none' }} opacity={isCharging ? 0.8 : 0} />
                <text x="29.5" y="4.5" fill="#fff" fontSize="2" fontWeight="bold" textAnchor="middle" opacity="0.7">CHG</text>
                
                {/* Blue (Full) */}
                <rect x="34" y="6" width="3" height="2" fill={(!isCharging && inputVoltage > 4) ? '#3b82f6' : '#1e3a8a'} />
                <circle cx="35.5" cy="7" r="2" fill={(!isCharging && inputVoltage > 4) ? '#3b82f6' : 'transparent'} style={{ filter: (!isCharging && inputVoltage > 4) ? 'drop-shadow(0 0 3px #3b82f6)' : 'none' }} opacity={(!isCharging && inputVoltage > 4) ? 0.8 : 0} />
                <text x="35.5" y="4.5" fill="#fff" fontSize="2" fontWeight="bold" textAnchor="middle" opacity="0.7">FULL</text>

                {/* Pads (ENIG gold) */}
                <circle cx="3" cy="10" r="2.5" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.5" />
                <circle cx="3" cy="30" r="2.5" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.5" />
                <circle cx="60" cy="10" r="2.5" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.5" />
                <circle cx="60" cy="30" r="2.5" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.5" />

                {/* Pad Labels */}
                <text x="7" y="11" fill="#fff" fontSize="3" fontWeight="bold">IN+</text>
                <text x="7" y="31" fill="#fff" fontSize="3" fontWeight="bold">IN-</text>
                <text x="56" y="11" fill="#fff" fontSize="3" fontWeight="bold" textAnchor="end">B+</text>
                <text x="56" y="31" fill="#fff" fontSize="3" fontWeight="bold" textAnchor="end">B-</text>
                
                {/* Hidden snap points to ensure breadboard connectivity */}
                <circle cx="0" cy="10" r="1.5" fill="#333" opacity="0" />
                <circle cx="0" cy="30" r="1.5" fill="#333" opacity="0" />
                <circle cx="60" cy="10" r="1.5" fill="#333" opacity="0" />
                <circle cx="60" cy="30" r="1.5" fill="#333" opacity="0" />
            </svg>
        </div>
    );
};
