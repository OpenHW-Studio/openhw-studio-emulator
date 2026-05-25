import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 220, h: 100 };

export const HX711UI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const elRef = useRef<any>(null);

    const nativeW = 220;
    const nativeH = 100;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    const { load: attrLoad, onInteract, ...restAttrs } = attrs;
    const simValue = state?.load ?? attrLoad ?? "0";

    const [localLoad, setLocalLoad] = useState<string>(String(simValue));
    const localLoadRef = useRef(localLoad);

    // Sync local value from simulation state
    useLayoutEffect(() => {
        const newVal = String(simValue);
        if (newVal !== localLoadRef.current) {
            setLocalLoad(newVal);
            localLoadRef.current = newVal;
        }
    }, [simValue]);

    // Sync load property to the wokwi element
    useLayoutEffect(() => {
        if (elRef.current) {
            elRef.current.load = parseFloat(localLoad);
        }
    }, [localLoad]);

    // Listen for events from the wokwi element
    useLayoutEffect(() => {
        const el = elRef.current;
        if (!el) return;

        const handleInput = (e: any) => {
            if (!onInteract) return;

            let val: any = undefined;

            if (typeof e.detail === 'string' || typeof e.detail === 'number') {
                val = e.detail;
            } else if (el.load !== undefined) {
                val = el.load;
            } else if (e.target && e.target.value !== undefined) {
                val = e.target.value;
            }

            if (val !== undefined) {
                const strVal = String(val);
                setLocalLoad(strVal);
                localLoadRef.current = strVal;
                onInteract({ type: 'input', load: strVal });
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
            {React.createElement('wokwi-hx711', {
                ref: elRef,
                type: '5kg',
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
                onPointerDown: (e: any) => { if (isRunning) e.stopPropagation(); },
                onDoubleClick: (e: any) => { if (isRunning) e.stopPropagation(); },
            })}
        </div>
    );
};
