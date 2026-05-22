import React, { useEffect, useRef } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 100, h: 50 };

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
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none'
                }}
                energised={state?.energised ? 'true' : 'false'}
            />
        </div>
    );
};