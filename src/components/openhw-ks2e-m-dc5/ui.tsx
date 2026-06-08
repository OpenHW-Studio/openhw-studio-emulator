import React, { useEffect, useRef } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 165, h: 75 };

export const Ks2eUI = ({ state, attrs }: { state: any; attrs: any }) => {
    const elementRef = useRef<any>(null);

    // Sync energised state to the wokwi component
    useEffect(() => {
        if (elementRef.current && state?.energised !== undefined) {
            elementRef.current.setAttribute('energised', state.energised ? 'true' : 'false');
        }
    }, [state?.energised]);

    return (
        <div
            style={{
                position: 'relative',
                width: BOUNDS.w,
                height: BOUNDS.h,
                pointerEvents: 'none',
                overflow: 'visible'
            }}
        >
            <wokwi-ks2e-m-dc5
                ref={elementRef}
                style={{
                    position: 'absolute',
                    display: 'block',
                    width: 100,
                    height: 50,
                    left: 3.86,
                    top: -6.43,
                    pointerEvents: 'none',
                    transform: 'scale(1.5909, 1.6071)',
                    transformOrigin: '0 0'
                }}
                energised={state?.energised ? 'true' : 'false'}
            />
        </div>
    );
};
