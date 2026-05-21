import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 250, h: 100 };

export const NRF24L01ContextMenu = ({
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

export const NRF24L01UI = ({ state, attrs }: { state: any, attrs: any }) => {
    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400" width="100%" height="100%" style={{ display: 'block' }}>
                <rect x="40" y="40" width="760" height="320" fill="#161616" rx="4" />
                
                <circle cx="770" cy="75" r="16" fill="#e0e0e0" />
                <circle cx="770" cy="75" r="8" fill="#161616" />
                <circle cx="770" cy="325" r="16" fill="#e0e0e0" />
                <circle cx="770" cy="325" r="8" fill="#161616" />

                <g fill="#999">
                    <circle cx="80" cy="95" r="16" />
                    <circle cx="80" cy="165" r="16" />
                    <circle cx="80" cy="235" r="16" />
                    <circle cx="80" cy="305" r="16" />
                    <circle cx="130" cy="95" r="16" />
                    <circle cx="130" cy="165" r="16" />
                    <circle cx="130" cy="235" r="16" />
                    <circle cx="130" cy="305" r="16" />
                </g>
                <g fill="#e0e0e0">
                    <rect x="73" y="88" width="14" height="14" />
                    <rect x="73" y="158" width="14" height="14" />
                    <rect x="73" y="228" width="14" height="14" />
                    <rect x="73" y="298" width="14" height="14" />
                    <rect x="123" y="88" width="14" height="14" />
                    <rect x="123" y="158" width="14" height="14" />
                    <rect x="123" y="228" width="14" height="14" />
                    <rect x="123" y="298" width="14" height="14" />
                </g>

                <rect x="210" y="140" width="80" height="80" fill="#222" stroke="#444" strokeWidth="1" />
                <g fill="#e0e0e0">
                    <rect x="220" y="132" width="6" height="8" />
                    <rect x="235" y="132" width="6" height="8" />
                    <rect x="250" y="132" width="6" height="8" />
                    <rect x="265" y="132" width="6" height="8" />
                    <rect x="220" y="220" width="6" height="8" />
                    <rect x="235" y="220" width="6" height="8" />
                    <rect x="250" y="220" width="6" height="8" />
                    <rect x="265" y="220" width="6" height="8" />
                    <rect x="202" y="150" width="8" height="6" />
                    <rect x="202" y="165" width="8" height="6" />
                    <rect x="202" y="180" width="8" height="6" />
                    <rect x="202" y="195" width="8" height="6" />
                    <rect x="290" y="150" width="8" height="6" />
                    <rect x="290" y="165" width="8" height="6" />
                    <rect x="290" y="180" width="8" height="6" />
                    <rect x="290" y="195" width="8" height="6" />
                </g>
                <text x="230" y="175" fill="#ccc" fontFamily="sans-serif" fontSize="12" fontWeight="bold">NRF 0</text>
                <text x="230" y="195" fill="#ccc" fontFamily="sans-serif" fontSize="12" fontWeight="bold">24L01+</text>

                <rect x="235" y="260" width="65" height="45" fill="#f1c40f" rx="4" />
                <rect x="180" y="260" width="25" height="45" fill="#111" stroke="#555" strokeWidth="2" />
                <rect x="185" y="265" width="15" height="35" fill="#e0e0e0" />

                <rect x="460" y="145" width="55" height="55" fill="#222" />
                <g fill="#e0e0e0">
                    <rect x="470" y="137" width="5" height="8" />
                    <rect x="485" y="137" width="5" height="8" />
                    <rect x="500" y="137" width="5" height="8" />
                    
                    <rect x="470" y="200" width="5" height="8" />
                    <rect x="485" y="200" width="5" height="8" />
                    <rect x="500" y="200" width="5" height="8" />
                    
                    <rect x="452" y="155" width="8" height="5" />
                    <rect x="452" y="170" width="8" height="5" />
                    <rect x="452" y="185" width="8" height="5" />

                    <rect x="515" y="155" width="8" height="5" />
                    <rect x="515" y="170" width="8" height="5" />
                    <rect x="515" y="185" width="8" height="5" />
                </g>

                <g stroke="#fff" strokeWidth="1.5">
                    <rect x="160" y="55" width="20" height="40" fill="#111" />
                    <rect x="163" y="60" width="14" height="30" fill="#d4af37" />
                    <rect x="195" y="55" width="20" height="40" fill="#111" />
                    <rect x="198" y="60" width="14" height="30" fill="#6c6353" />
                    <rect x="230" y="55" width="20" height="40" fill="#111" />
                    <rect x="233" y="60" width="14" height="30" fill="#d4af37" />
                    <rect x="265" y="55" width="20" height="40" fill="#111" />
                    <rect x="268" y="60" width="14" height="30" fill="#000" />
                    
                    <rect x="455" y="55" width="20" height="40" fill="#111" />
                    <rect x="458" y="60" width="14" height="30" fill="#e0e0e0" />
                    <rect x="485" y="55" width="20" height="40" fill="#111" />
                    <rect x="488" y="60" width="14" height="30" fill="#000" />
                    <rect x="515" y="55" width="20" height="40" fill="#111" />
                    <rect x="518" y="60" width="14" height="30" fill="#d4af37" />

                    <rect x="455" y="255" width="20" height="40" fill="#111" />
                    <rect x="458" y="260" width="14" height="30" fill="#000" />
                    <rect x="485" y="255" width="20" height="40" fill="#111" />
                    <rect x="488" y="260" width="14" height="30" fill="#000" />

                    <rect x="310" y="150" width="20" height="40" fill="#111" />
                    <rect x="313" y="155" width="14" height="30" fill="#e0e0e0" />

                    <rect x="340" y="200" width="20" height="40" fill="#111" />
                    <rect x="343" y="205" width="14" height="30" fill="#e0e0e0" />
                    
                    <rect x="395" y="110" width="40" height="20" fill="#111" />
                    <rect x="400" y="113" width="30" height="14" fill="#e0e0e0" />

                    <rect x="380" y="170" width="40" height="20" fill="#111" />
                    <rect x="385" y="173" width="30" height="14" fill="#e0e0e0" />
                    
                    <rect x="380" y="210" width="40" height="20" fill="#111" />
                    <rect x="385" y="213" width="30" height="14" fill="#d4af37" />

                    <rect x="540" y="150" width="20" height="40" fill="#111" />
                    <rect x="543" y="155" width="14" height="30" fill="#e0e0e0" />
                    <rect x="620" y="150" width="20" height="40" fill="#111" />
                    <rect x="623" y="155" width="14" height="30" fill="#e0e0e0" />
                    <rect x="565" y="160" width="40" height="20" fill="#111" />
                    <rect x="570" y="163" width="30" height="14" fill="#e0e0e0" />
                </g>

                <g stroke="#ccc" strokeWidth="1.5">
                    <rect x="650" y="110" width="140" height="130" fill="none" />
                    <rect x="665" y="125" width="110" height="100" fill="none" />
                </g>
                
                <rect x="675" y="130" width="105" height="130" fill="#e6c229" rx="6" />
                
                <rect x="780" y="150" width="150" height="90" fill="#f1c40f" />
                <g fill="#cda814">
                    <rect x="785" y="145" width="4" height="100" />
                    <rect x="795" y="145" width="4" height="100" />
                    <rect x="805" y="145" width="4" height="100" />
                    <rect x="815" y="145" width="4" height="100" />
                    <rect x="825" y="145" width="4" height="100" />
                    <rect x="835" y="145" width="4" height="100" />
                    <rect x="845" y="145" width="4" height="100" />
                    <rect x="855" y="145" width="4" height="100" />
                    <rect x="865" y="145" width="4" height="100" />
                    <rect x="875" y="145" width="4" height="100" />
                    <rect x="885" y="145" width="4" height="100" />
                    <rect x="895" y="145" width="4" height="100" />
                    <rect x="905" y="145" width="4" height="100" />
                    <rect x="915" y="145" width="4" height="100" />
                </g>

                {/* Optional Status Indicators */}
                {state?.mode === 'TX' && (
                    <circle cx="210" cy="80" r="15" fill="red" opacity="0.6">
                        <animate attributeName="opacity" values="0.2;0.8;0.2" dur="0.5s" repeatCount="indefinite" />
                    </circle>
                )}
                {state?.mode === 'RX' && (
                    <circle cx="250" cy="80" r="15" fill="green" opacity="0.6">
                        <animate attributeName="opacity" values="0.2;0.8;0.2" dur="1s" repeatCount="indefinite" />
                    </circle>
                )}
            </svg>
        </div>
    );
};
