import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 240, h: 114 }; // Scaled down from 760x360

export const CC1101ContextMenu = ({
    attrs,
    onUpdate,
}: {
    attrs: any;
    onUpdate: (key: string, value: any) => void;
}) => (
    <>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Magic Interop (Ignore Mod):</span>
        <select
            value={attrs?.magicInterop ?? 'false'}
            onChange={e => onUpdate('magicInterop', e.target.value)}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        >
            <option value="false">Disabled (Strict Physics)</option>
            <option value="true">Enabled (Accept All)</option>
        </select>
    </>
);

export const CC1101UI = ({ state, attrs }: { state: any, attrs: any }) => {
    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 360" width="100%" height="100%" style={{ display: 'block' }}>
                <defs>
                    <circle id="via" cx="0" cy="0" r="2.5" fill="#0d2b4a" />
                    
                    <g id="smd-h">
                        <rect x="-8" y="-4" width="16" height="8" fill="#e0e0e0" />
                        <rect x="-8" y="-4" width="4" height="8" fill="#a0a0a0" />
                        <rect x="4" y="-4" width="4" height="8" fill="#a0a0a0" />
                    </g>
                    <g id="smd-v">
                        <rect x="-4" y="-8" width="8" height="16" fill="#e0e0e0" />
                        <rect x="-4" y="-8" width="8" height="4" fill="#a0a0a0" />
                        <rect x="-4" y="4" width="8" height="4" fill="#a0a0a0" />
                    </g>
                    
                    <g id="pth-round">
                        <circle cx="0" cy="0" r="14" fill="#d4d4d4" />
                        <circle cx="0" cy="0" r="11" fill="#eeeeee" />
                        <circle cx="0" cy="0" r="7" fill="#222222" />
                    </g>

                    <g id="thread">
                        <rect x="0" y="0" width="7" height="96" fill="#cda332" rx="2" />
                        <rect x="2" y="0" width="3" height="96" fill="#ebd27b" rx="1" />
                    </g>
                </defs>

                <rect x="38" y="48" width="504" height="264" fill="#c49a46" rx="2" />
                <rect x="40" y="50" width="500" height="260" fill="#1b548f" rx="1" />

                <g fill="none" stroke="#2d71b8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M 120 180 L 160 180 L 160 160 L 210 160" />
                    <path d="M 120 220 L 170 220 L 170 200 L 210 200" />
                    <path d="M 280 180 L 320 180 L 320 150 L 370 150 L 370 180 L 410 180 L 410 200 L 460 200" />
                    <path d="M 280 200 L 300 200 L 300 240 L 330 240 L 330 190" />
                    <path d="M 140 100 L 140 260 L 40 260" strokeWidth="1.5" stroke="#2664a3" />
                    <path d="M 200 120 L 200 240 L 290 240 L 290 120 Z" strokeWidth="1.5" stroke="#2664a3" />
                </g>

                <g>
                    <use href="#via" x="330" y="70" />
                    <use href="#via" x="350" y="70" />
                    <use href="#via" x="370" y="70" />
                    <use href="#via" x="390" y="70" />
                    <use href="#via" x="410" y="70" />
                    <use href="#via" x="430" y="70" />
                    
                    <use href="#via" x="320" y="110" />
                    <use href="#via" x="340" y="125" />
                    <use href="#via" x="360" y="110" />
                    <use href="#via" x="380" y="130" />
                    
                    <use href="#via" x="440" y="160" />
                    <use href="#via" x="460" y="150" />
                    <use href="#via" x="420" y="240" />
                    <use href="#via" x="440" y="230" />
                    
                    <use href="#via" x="330" y="290" />
                    <use href="#via" x="350" y="290" />
                    <use href="#via" x="370" y="290" />
                    <use href="#via" x="390" y="290" />
                    <use href="#via" x="410" y="290" />
                    <use href="#via" x="430" y="290" />
                    
                    <use href="#via" x="330" y="260" />
                    <use href="#via" x="360" y="240" />
                    
                    <use href="#via" x="180" y="140" />
                    <use href="#via" x="190" y="150" />
                    <use href="#via" x="180" y="220" />
                    <use href="#via" x="190" y="210" />
                    <use href="#via" x="300" y="130" />
                    <use href="#via" x="310" y="140" />
                </g>

                <g fill="#ffffff" fontFamily="sans-serif" fontSize="16" fontWeight="bold">
                    <text x="60" y="85">1</text>
                    <text x="100" y="85">2</text>
                    <text x="60" y="295">7</text>
                    <text x="100" y="295">8</text>
                    <text x="470" y="90" fontSize="20" letterSpacing="1">433M</text>
                    <text x="460" y="290" fontSize="18">V2.0</text>
                    
                    <g stroke="#ffffff" strokeWidth="2" fill="none">
                    <path d="M 45 100 L 135 100 L 135 255 L 45 255 L 45 100" />
                    <path d="M 45 140 L 135 140" />
                    <path d="M 45 100 L 85 100 L 85 140 L 45 140 Z" />
                    
                    <circle cx="210" cy="130" r="2" fill="#ffffff" stroke="none" />
                    <path d="M 195 145 L 195 125 L 215 125" />
                    <path d="M 275 125 L 295 125 L 295 145" />
                    <path d="M 195 215 L 195 235 L 215 235" />
                    <path d="M 275 235 L 295 235 L 295 215" />
                    
                    <path d="M 205 240 L 285 240 L 285 300 L 205 300 Z" />
                    </g>
                </g>

                <g>
                    <circle cx="420" cy="100" r="24" fill="#c49a46" />
                    <circle cx="420" cy="100" r="16" fill="#ffffff" /> <circle cx="420" cy="260" r="24" fill="#c49a46" />
                    <circle cx="420" cy="260" r="16" fill="#ffffff" />
                    <circle cx="350" cy="275" r="10" fill="#c49a46" />
                </g>

                <rect x="51" y="106" width="28" height="28" fill="#d4d4d4" rx="2" />
                <rect x="54" y="109" width="22" height="22" fill="#eeeeee" rx="1" />
                <circle cx="65" cy="120" r="7" fill="#222222" />
                <use href="#pth-round" x="110" y="120" />
                <use href="#pth-round" x="65" y="165" />
                <use href="#pth-round" x="110" y="165" />
                <use href="#pth-round" x="65" y="210" />
                <use href="#pth-round" x="110" y="210" />
                <use href="#pth-round" x="65" y="255" />
                <use href="#pth-round" x="110" y="255" />

                <use href="#smd-v" x="160" y="145" />
                <use href="#smd-v" x="160" y="215" />
                <use href="#smd-h" x="235" y="105" />
                <use href="#smd-v" x="265" y="105" />
                <use href="#smd-v" x="285" y="130" />
                <use href="#smd-h" x="210" y="225" />
                <use href="#smd-v" x="280" y="235" />
                <use href="#smd-v" x="295" y="235" />
                
                <use href="#smd-h" x="320" y="150" />
                <use href="#smd-h" x="345" y="150" />
                <use href="#smd-h" x="375" y="165" />
                <use href="#smd-h" x="390" y="165" />
                
                <use href="#smd-v" x="320" y="175" />
                <use href="#smd-v" x="310" y="210" />
                <use href="#smd-v" x="330" y="200" />
                <use href="#smd-v" x="380" y="195" />
                
                <use href="#smd-h" x="425" y="180" />
                <use href="#smd-h" x="450" y="180" />

                <rect x="205" y="140" width="80" height="80" fill="#202020" rx="3" />
                <g fill="#b0b0b0">
                    <rect x="215" y="136" width="6" height="8" /><rect x="227" y="136" width="6" height="8" /><rect x="239" y="136" width="6" height="8" /><rect x="251" y="136" width="6" height="8" /><rect x="263" y="136" width="6" height="8" />
                    <rect x="215" y="216" width="6" height="8" /><rect x="227" y="216" width="6" height="8" /><rect x="239" y="216" width="6" height="8" /><rect x="251" y="216" width="6" height="8" /><rect x="263" y="216" width="6" height="8" />
                    <rect x="199" y="152" width="8" height="6" /><rect x="199" y="164" width="8" height="6" /><rect x="199" y="176" width="8" height="6" /><rect x="199" y="188" width="8" height="6" /><rect x="199" y="200" width="8" height="6" />
                    <rect x="283" y="152" width="8" height="6" /><rect x="283" y="164" width="8" height="6" /><rect x="283" y="176" width="8" height="6" /><rect x="283" y="188" width="8" height="6" /><rect x="283" y="200" width="8" height="6" />
                </g>
                <g fill="#7a7a7a" fontFamily="monospace, sans-serif" fontSize="11" textAnchor="middle">
                    <text x="245" y="165" fill="#a0a0a0" fontWeight="bold">CC1101</text>
                    <text x="245" y="185">TI 221</text>
                    <text x="245" y="205">COL6 G4</text>
                </g>

                <rect x="215" y="250" width="60" height="40" fill="#d0d0d0" rx="3" stroke="#e8e8e8" strokeWidth="2" />
                <rect x="222" y="255" width="46" height="30" fill="#9e9e9e" rx="2" />
                <text x="245" y="268" fill="#ffffff" fontFamily="sans-serif" fontSize="10" fontWeight="bold" textAnchor="middle">26.000</text>
                <text x="245" y="280" fill="#ffffff" fontFamily="sans-serif" fontSize="10" fontWeight="bold" textAnchor="middle">MHZ</text>

                <rect x="490" y="145" width="60" height="12" fill="#cda332" /> <rect x="465" y="175" width="90" height="8" fill="#cda332" />  <rect x="490" y="205" width="60" height="12" fill="#cda332" /> 
                <g fill="#d0d0d0">
                    <ellipse cx="505" cy="151" rx="35" ry="14" fill="#c4c4c4" />
                    <ellipse cx="505" cy="148" rx="25" ry="6" fill="#e8e8e8" />
                    <ellipse cx="495" cy="179" rx="30" ry="10" fill="#c4c4c4" />
                    <ellipse cx="495" cy="177" rx="20" ry="4" fill="#e8e8e8" />
                    <ellipse cx="505" cy="211" rx="35" ry="14" fill="#c4c4c4" />
                    <ellipse cx="505" cy="208" rx="25" ry="6" fill="#e8e8e8" />
                </g>

                <rect x="545" y="132" width="25" height="96" fill="#cda332" />
                <rect x="550" y="132" width="10" height="96" fill="#ebd27b" /> <rect x="570" y="136" width="12" height="88" fill="#bc9229" />
                
                <rect x="582" y="170" width="8" height="20" fill="#f8f8f8" />
                
                <rect x="590" y="142" width="120" height="76" fill="#d8b244" />
                
                <use href="#thread" x="595" y="132" />
                <use href="#thread" x="605" y="132" />
                <use href="#thread" x="615" y="132" />
                <use href="#thread" x="625" y="132" />
                <use href="#thread" x="635" y="132" />
                <use href="#thread" x="645" y="132" />
                <use href="#thread" x="655" y="132" />
                <use href="#thread" x="665" y="132" />
                <use href="#thread" x="675" y="132" />
                <use href="#thread" x="685" y="132" />
                <use href="#thread" x="695" y="132" />

                <rect x="590" y="142" width="120" height="15" fill="#ffffff" opacity="0.4" />
                <rect x="590" y="203" width="120" height="15" fill="#000000" opacity="0.3" />

                <path d="M 710 142 L 725 152 L 725 208 L 710 218 Z" fill="#ebd27b" />
                <path d="M 710 142 L 715 152 L 715 208 L 710 218 Z" fill="#ffffff" opacity="0.5" />

                {/* Optional Status Indicators */}
                {state?.state === 'TX' && (
                    <circle cx="160" cy="180" r="20" fill="red" opacity="0.6">
                        <animate attributeName="opacity" values="0.2;0.8;0.2" dur="0.5s" repeatCount="indefinite" />
                    </circle>
                )}
                {state?.state === 'RX' && (
                    <circle cx="160" cy="180" r="20" fill="green" opacity="0.6">
                        <animate attributeName="opacity" values="0.2;0.8;0.2" dur="1s" repeatCount="indefinite" />
                    </circle>
                )}
            </svg>
        </div>
    );
};
