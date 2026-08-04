import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 435, h: 435 };

export const BiaxialStepperUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const outerAngle = state?.outerAngle ?? 0;
    const innerAngle = state?.innerAngle ?? 0;

    return (
        <div style={{
            position: 'relative',
            width: BOUNDS.w,
            height: BOUNDS.h,
            pointerEvents: 'none',
            overflow: 'visible'
        }}>
            <wokwi-biaxial-stepper
                outerhandangle={outerAngle}
                innerhandangle={innerAngle}
                outerhandlength={attrs?.outerHandLength || '30'}
                outerhandcolor={attrs?.outerHandColor || 'gold'}
                outerhandshape={attrs?.outerHandShape || 'plain'}
                innerhandlength={attrs?.innerHandLength || '30'}
                innerhandcolor={attrs?.innerHandColor || 'silver'}
                innerhandshape={attrs?.innerHandShape || 'plain'}
                style={{
                    display: 'block',
                    pointerEvents: 'none',
                    position: 'absolute',
                    width: 280,
                    height: 280,
                    left: 82.647,
                    top: 57.426,
                    transform: 'scale(1.5441176)',
                    transformOrigin: 'center center'
                }}
            />
        </div>
    );
};
