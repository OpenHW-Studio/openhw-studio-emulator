import React, { useEffect, useRef } from 'react';
import { BOUNDS } from './constants';

export const AnalogJoystickUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const joyRef = useRef<any>(null);

    useEffect(() => {
        if (!joyRef.current) return;
        const el = joyRef.current;

        const onMove = () => {
            console.log("Joystick moved! xValue:", el.xValue, "yValue:", el.yValue);
            if (isRunning && attrs.onInteract) {
                // The wokwi-analog-joystick element emits 'input' and stores coordinates in xValue and yValue properties
                attrs.onInteract({ type: 'joystick-move', x: el.xValue || 0, y: el.yValue || 0 });
            }
        };

        const onDown = () => {
            console.log("Joystick pressed!");
            if (isRunning && attrs.onInteract) attrs.onInteract({ type: 'button-press' });
        };
        const onUp = () => {
            console.log("Joystick released!");
            if (isRunning && attrs.onInteract) attrs.onInteract({ type: 'button-release' });
        };

        el.addEventListener('input', onMove);
        el.addEventListener('button-press', onDown);
        el.addEventListener('button-release', onUp);

        return () => {
            el.removeEventListener('input', onMove);
            el.removeEventListener('button-press', onDown);
            el.removeEventListener('button-release', onUp);
        };
    }, [isRunning, attrs]);

    return (
        <div
            onMouseDown={(e: React.MouseEvent) => { if (isRunning) e.stopPropagation(); }}
            style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}
        >
            {React.createElement('wokwi-analog-joystick', {
                ref: joyRef,
                style: { pointerEvents: isRunning ? 'auto' : 'none', width: '100%', height: '100%' },
                ...attrs
            })}
        </div>
    );
};
