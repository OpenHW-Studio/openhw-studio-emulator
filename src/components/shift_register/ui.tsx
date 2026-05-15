import * as React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 135, h: 45 };

export const ShiftRegisterUI = (props: any) => {
    const { rotation } = props;

    const nativeW = 180;
    const nativeH = 60;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    return (
        <div style={{
            pointerEvents: 'none',
            width: BOUNDS.w,
            height: BOUNDS.h,
            position: 'relative',
            transform: `rotate(${rotation || 0}deg)`
        }}>
            <div style={{
                width: nativeW,
                height: nativeH,
                background: '#222',
                borderRadius: 4,
                border: '2px solid #444',
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `scale(${scaleX}, ${scaleY})`,
                transformOrigin: '0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box'
            }}>
                <div style={{
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 'bold',
                    fontFamily: 'monospace'
                }}>
                    74HC595
                </div>
                
                {/* Notch */}
                <div style={{
                    width: 6,
                    height: 12,
                    borderRadius: '0 3px 3px 0',
                    background: '#111',
                    position: 'absolute',
                    top: 24,
                    left: 0
                }} />
            </div>
        </div>
    );
};
