import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 120, h: 120 };

export const BatteryContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => (
    <>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Capacity (mAh):</span>
        <input 
            type="number"
            value={attrs?.capacityMah || '2000'}
            onChange={e => onUpdate('capacityMah', e.target.value)}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        />
    </>
);

export const BatteryUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const charge = state?.currentChargeMah ?? attrs?.currentChargeMah ?? 2000;
    const capacity = state?.capacityMah ?? attrs?.capacityMah ?? 2000;
    const percentage = Math.max(0, Math.min(100, Math.round((charge / capacity) * 100)));
    
    const nativeW = 120;
    const nativeH = 120;

    return (
        <div style={{
            width: BOUNDS.w,
            height: BOUNDS.h,
            pointerEvents: 'none',
            position: 'relative'
        }}>
            <svg
                width={nativeW}
                height={nativeH}
                viewBox="0 0 120 120"
                style={{
                    display: 'block'
                }}
            >
                {/* Battery Body (Cylindrical representation) */}
                <rect x="30" y="10" width="80" height="100" rx="10" fill="#2c3e50" stroke="#1a252f" strokeWidth="2" />
                
                {/* Positive Terminal (+) */}
                <rect x="60" y="2" width="20" height="8" rx="2" fill="#95a5a6" />
                
                {/* Charge Level Indicator */}
                <rect 
                    x="35" 
                    y={15 + (90 * (1 - percentage / 100))} 
                    width="70" 
                    height={90 * (percentage / 100)} 
                    rx="5" 
                    fill={percentage < 20 ? "#e74c3c" : "#2ecc71"} 
                    opacity="0.8"
                />

                {/* Percentage Text */}
                <text x="70" y="65" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                    {percentage}%
                </text>

                {/* Labels at y=15 and y=45 */}
                <text x="5" y="20" fill="#e74c3c" fontSize="16" fontWeight="bold" textAnchor="start">+</text>
                <text x="5" y="50" fill="#95a5a6" fontSize="16" fontWeight="bold" textAnchor="start">-</text>
            </svg>
        </div>
    );
};
