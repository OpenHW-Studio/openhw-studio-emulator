import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 340, h: 180 };

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

    const W = BOUNDS.w;
    const H = BOUNDS.h;

    return (
        <div tabIndex={-1} style={{ position: 'relative', width: W, height: H, outline: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}>
            <svg
                width={W}
                height={H}
                viewBox={`0 0 ${W} ${H}`}
                style={{ fontFamily: 'Arial, sans-serif', display: 'block' }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* Metallic screw gradient */}
                    <radialGradient id="metalGrad" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                        <stop offset="35%" stopColor="#d9d9d9" stopOpacity="1" />
                        <stop offset="100%" stopColor="#9a9a9a" stopOpacity="1" />
                    </radialGradient>

                    {/* Subtle highlight for screw center */}
                    <linearGradient id="screwSlot" x1="0" x2="1">
                        <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#000" stopOpacity="0.25" />
                    </linearGradient>

                    {/* Relay drop shadow */}
                    <filter id="relayDrop" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.35" />
                    </filter>

                    {/* PCB drop shadow */}
                    <filter id="pcbShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.2" />
                    </filter>
                </defs>
                {/* === PCB Base (red) === */}
                <rect x="30" y="5" width={W - 40} height={H - 10} rx="5" fill="#d32f2f" filter="url(#pcbShadow)" />
                <rect x="30" y="5" width={W - 40} height={H - 10} rx="5" fill="none" stroke="#b71c1c" strokeWidth="1.2" />

                {/* Mounting holes (4 corners) */}
                <circle cx="42" cy="17" r="5" fill="#333" stroke="#222" strokeWidth="1" />
                <circle cx="42" cy="17" r="2.5" fill="#555" />
                <circle cx={W - 22} cy="17" r="5" fill="#333" stroke="#222" strokeWidth="1" />
                <circle cx={W - 22} cy="17" r="2.5" fill="#555" />
                <circle cx="42" cy={H - 17} r="5" fill="#333" stroke="#222" strokeWidth="1" />
                <circle cx="42" cy={H - 17} r="2.5" fill="#555" />
                <circle cx={W - 22} cy={H - 17} r="5" fill="#333" stroke="#222" strokeWidth="1" />
                <circle cx={W - 22} cy={H - 17} r="2.5" fill="#555" />

                {/* ====== PWR LED (top-left area) ====== */}
                {/* Big green circle */}
                <circle cx="68" cy="20" r="7" fill="#27ae60" />
                <circle cx="68" cy="20" r="3" fill="#2ecc71" opacity="0.8" />

                {/* SMD LED package for PWR */}
                <g transform="translate(58, 32)">
                    <rect x="0" y="0" width="24" height="14" rx="1.5" fill="#fff" stroke="#ccc" strokeWidth="0.8" />
                    <rect x="3" y="2" width="8" height="10" fill="#e74c3c" opacity="0.5" />
                    <rect x="13" y="2" width="8" height="10" fill="#bdc3c7" />
                </g>
                <text x="88" y="43" fill="#fff" fontSize="11" fontWeight="700">PWR</text>

                {/* ====== Input Pin Header (VCC, GND, IN) ====== */}
                <g transform="translate(56, 52)">
                    {/* Pin header black body */}
                    <rect x="0" y="-4" width="14" height="54" rx="1.5" fill="#1a1a2e" stroke="#111" strokeWidth="1" />

                    {/* VCC pin — trace extends left outside board (thicker) */}
                    <line x1="-26" y1="8" x2="0" y2="8" stroke="#bdc3c7" strokeWidth="3.5" />
                    <circle cx="7" cy="8" r="4" fill="#fbbf24" stroke="#b8860b" strokeWidth="0.6" />
                    <circle cx="7" cy="8" r="14" fill="#000" opacity="0" />

                    {/* GND pin — 15px below VCC */}
                    <line x1="-26" y1="23" x2="0" y2="23" stroke="#bdc3c7" strokeWidth="3.5" />
                    <circle cx="7" cy="23" r="4" fill="#fbbf24" stroke="#b8860b" strokeWidth="0.6" />
                    <circle cx="7" cy="23" r="14" fill="#000" opacity="0" />

                    {/* IN pin — 15px below GND */}
                    <line x1="-26" y1="38" x2="0" y2="38" stroke="#bdc3c7" strokeWidth="3.5" />
                    <circle cx="7" cy="38" r="4" fill="#fbbf24" stroke="#b8860b" strokeWidth="0.6" />
                    <circle cx="7" cy="38" r="14" fill="#000" opacity="0" />

                    {/* Labels to the right of the header */}
                    <text x="20" y="12" fill="#fff" fontSize="12" fontWeight="700">VCC</text>
                    <text x="20" y="27" fill="#fff" fontSize="12" fontWeight="700">GND</text>
                    <text x="20" y="42" fill="#fff" fontSize="12" fontWeight="700">IN</text>
                </g>

                {/* ====== LED1 (bottom-left) ====== */}
                <g transform="translate(58, 138)">
                    <rect x="0" y="0" width="24" height="14" rx="1.5" fill="#fff" stroke="#ccc" strokeWidth="0.8" />
                    <rect x="3" y="2" width="8" height="10" fill={energised ? '#2ecc71' : '#145a32'} />
                    <rect x="13" y="2" width="8" height="10" fill="#bdc3c7" />
                </g>
                <text x="88" y="149" fill="#fff" fontSize="11" fontWeight="700">LED1</text>

                {/* ====== Relay Body (large blue box, center-right) ====== */}
                <g transform="translate(148, 22)">
                    <rect x="0" y="0" width="120" height="130" rx="4" fill="#2471a3" stroke="#1a5276" strokeWidth="1.2" filter="url(#relayDrop)" />
                    <rect x="5" y="5" width="110" height="120" rx="3" fill="#3498db" />

                    {/* subtle inset to give depth */}
                    <rect x="6" y="6" width="108" height="118" rx="2.5" fill="none" stroke="rgba(255,255,255,0.06)" />

                    {/* Relay label */}
                    <text x="60" y="52" fill="#fff" fontSize="28" fontWeight="700" textAnchor="middle">Relay</text>
                    <text x="60" y="78" fill="#ecf0f1" fontSize="18" fontWeight="600" textAnchor="middle">Module</text>

                    {/* Status indicator dot */}
                    <circle cx="25" cy="108" r="4" fill={energised ? '#8e44ad' : '#4a235a'} />
                </g>

                {/* ====== Output Screw Terminal Block (NO, COM, NC) ====== */}
                <g transform="translate(285, 20)">
                    <rect x="0" y="0" width="30" height="140" rx="2" fill="#2471a3" stroke="#1a5276" strokeWidth="1.2" />

                    {/* NO screw terminal (metallic) — at y=25 => absolute y=45 */}
                    <circle cx="15" cy="25" r="10" fill="url(#metalGrad)" stroke="#8f9597" strokeWidth="0.9" />
                    {/* slot */}
                    <rect x="8" y="23.2" width="14" height="2" rx="1" fill="#566573" />
                    <ellipse cx="15" cy="21.5" rx="6" ry="2" fill="rgba(255,255,255,0.14)" />
                    <circle cx="15" cy="25" r="12" fill="#000" opacity="0" />

                    {/* COM screw terminal — at y=70 => absolute y=90 */}
                    <circle cx="15" cy="70" r="10" fill="url(#metalGrad)" stroke="#8f9597" strokeWidth="0.9" />
                    <rect x="8" y="68.2" width="14" height="2" rx="1" fill="#566573" transform="rotate(15,15,70)" />
                    <ellipse cx="15" cy="66.5" rx="6" ry="2" fill="rgba(255,255,255,0.12)" />
                    <circle cx="15" cy="70" r="12" fill="#000" opacity="0" />

                    {/* NC screw terminal — at y=115 => absolute y=135 */}
                    <circle cx="15" cy="115" r="10" fill="url(#metalGrad)" stroke="#8f9597" strokeWidth="0.9" />
                    <rect x="8" y="113.2" width="14" height="2" rx="1" fill="#566573" transform="rotate(-15,15,115)" />
                    <ellipse cx="15" cy="111.5" rx="6" ry="2" fill="rgba(255,255,255,0.12)" />
                    <circle cx="15" cy="115" r="12" fill="#000" opacity="0" />
                </g>

                {/* NO / COM / NC labels — rotated 90° to the right of the terminal block */}
                <text x="323" y="48" fill="#fff" fontSize="11" fontWeight="700" textAnchor="middle" transform="rotate(90, 323, 48)">NO</text>
                <text x="323" y="93" fill="#fff" fontSize="11" fontWeight="700" textAnchor="middle" transform="rotate(90, 323, 93)">COM</text>
                <text x="323" y="138" fill="#fff" fontSize="11" fontWeight="700" textAnchor="middle" transform="rotate(90, 323, 138)">NC</text>

                {/* Tiny PCB details: silkscreen dots, fake resistor marks, traces */}
                <g>
                    {/* small silkscreen dots */}
                    <circle cx="60" cy="16" r="1.1" fill="#fff" opacity="0.9" />
                    <circle cx="90" cy="150" r="1" fill="#fff" opacity="0.8" />
                    {/* fake resistor markings */}
                    <rect x="110" y="30" width="18" height="4" rx="1" fill="#7f8c8d" opacity="0.7" />
                    <rect x="130" y="34" width="2" height="8" fill="#fff" opacity="0.12" />
                    {/* thin white traces */}
                    <path d="M84 22 L118 36" stroke="#fff" strokeWidth="0.8" opacity="0.18" strokeLinecap="round" />
                </g>

            </svg>
        </div>
    );
};
