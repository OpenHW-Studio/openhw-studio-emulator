import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';

// Bounding box for the blue selection ring.
// x, y: offset from comp.x/comp.y (top-left corner of the visual area)
// w, h: width and height of the visual area
export const BOUNDS = { x: 0, y: 0, w: 112.5, h: 112.5 };

export const PotentiometerUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const elRef = useRef<any>(null);

    const nativeW = 75;
    const nativeH = 75;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    const isDraggingRef = useRef(false);

    const { value: attrValue, onInteract, ...restAttrs } = attrs;
    const simValue = state?.value ?? attrValue ?? 50;

    useLayoutEffect(() => {
        if (elRef.current && !isDraggingRef.current) {
            elRef.current.value = simValue;
        }
    }, [simValue]);

    useEffect(() => {
        const handleGlobalUp = () => {
            isDraggingRef.current = false;
        };
        window.addEventListener('pointerup', handleGlobalUp);
        window.addEventListener('pointercancel', handleGlobalUp);
        return () => {
            window.removeEventListener('pointerup', handleGlobalUp);
            window.removeEventListener('pointercancel', handleGlobalUp);
        };
    }, []);

    useLayoutEffect(() => {
        const el = elRef.current;
        if (!el) return;

        const handleInput = (e: any) => {
            if (onInteract) {
                let val = undefined;
                if (typeof e.detail === 'number') val = e.detail;
                else if (e.detail && e.detail.value !== undefined) val = e.detail.value;
                else if (e.target && e.target.value !== undefined) val = e.target.value;
                else if (e.target && e.target.percent !== undefined) val = e.target.percent;

                if (val !== undefined) {
                    onInteract({ type: 'input', value: Number(val) });
                }
            }
        };

        el.addEventListener('input', handleInput);
        el.addEventListener('change', handleInput);
        return () => {
            el.removeEventListener('input', handleInput);
            el.removeEventListener('change', handleInput);
        };
    }, [onInteract]);

    return (
        <div style={{ 
            pointerEvents: 'none',
            width: BOUNDS.w,
            height: BOUNDS.h,
            position: 'relative',
            overflow: 'visible'
        }}>
            {React.createElement('wokwi-potentiometer', {
                ref: elRef,
                ...restAttrs,
                style: { 
                    ...attrs.style, 
                    display: 'block',
                    width: nativeW,
                    height: nativeH,
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '0 0',
                    pointerEvents: isRunning ? 'auto' : 'none'
                },
                onMouseDown: (e: any) => { if (isRunning) e.stopPropagation(); },
                onPointerDown: (e: any) => {
                    if (!isRunning) return;
                    isDraggingRef.current = true;
                    e.stopPropagation();
                },
                onDoubleClick: (e: any) => { if (isRunning) e.stopPropagation(); },
            })}
        </div>
    );
};
