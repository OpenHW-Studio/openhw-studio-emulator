import React, { useEffect, useRef } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 265.84, h: 343.94 };

export const KeypadUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const elRef = useRef<HTMLElement>(null);
    const nativeW = 265.84;
    const nativeH = 343.94;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    useEffect(() => {
        const el = elRef.current;
        if (!el) return;

        const handlePress = (e: Event) => {
            const key = (e as CustomEvent).detail.key;
            if (attrs.onInteract) attrs.onInteract(`press:${key}`);
        };

        const handleRelease = (e: Event) => {
            if (attrs.onInteract) attrs.onInteract('release');
        };

        el.addEventListener('button-press', handlePress);
        el.addEventListener('button-release', handleRelease);

        return () => {
            el.removeEventListener('button-press', handlePress);
            el.removeEventListener('button-release', handleRelease);
        };
    }, [attrs.onInteract]);

    return (
        <div style={{
            pointerEvents: isRunning ? 'auto' : 'none',
            width: BOUNDS.w,
            height: BOUNDS.h,
            position: 'relative',
            overflow: 'visible'
        }}>
            {React.createElement('wokwi-membrane-keypad', {
                ref: elRef,
                columns: '4',
                connector: true,
                style: {
                    display: 'block',
                    width: nativeW,
                    height: nativeH,
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '0 0'
                }
            })}
        </div>
    );
};
