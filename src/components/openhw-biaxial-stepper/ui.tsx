import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 280, h: 280 };

export const BiaxialStepperUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const outerAngle = state?.outerAngle ?? 0;
    const innerAngle = state?.innerAngle ?? 0;

    return (
        <div style={{
            position: 'relative',
            width: BOUNDS.w,
            height: BOUNDS.h,
            pointerEvents: 'none',
            overflow: 'visible',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
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
                    pointerEvents: 'none'
                }}
            />
        </div>
    );
};
