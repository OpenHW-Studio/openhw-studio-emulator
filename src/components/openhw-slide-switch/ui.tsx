import React, { useRef, useLayoutEffect, useState } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 34, h: 32 };

export const SlideSwitchUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const elRef = useRef<any>(null);

    const nativeW = 34;
    const nativeH = 32;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    const { value: attrValue, onInteract, ...restAttrs } = attrs;
    const simValue = state?.value ?? attrValue ?? "0";

    // Track local switch state for immediate visual feedback
    const [localValue, setLocalValue] = useState<string>(String(simValue));
    const localValueRef = useRef(localValue);

    // Sync local value from simulation state (e.g. initial load)
    useLayoutEffect(() => {
        const newVal = String(simValue);
        if (newVal !== localValueRef.current) {
            setLocalValue(newVal);
            localValueRef.current = newVal;
        }
    }, [simValue]);

    // Sync value property to the wokwi element visually
    useLayoutEffect(() => {
        if (elRef.current) {
            // The wokwi element expects 0 or 1 (number) for its value property
            const numVal = localValue === "1" || localValue === "true" ? 1 : 0;
            elRef.current.value = numVal;
        }
    }, [localValue]);

    return (
        <div 
            style={{ 
                width: BOUNDS.w,
                height: BOUNDS.h,
                position: 'relative',
                overflow: 'visible',
                pointerEvents: isRunning ? 'auto' : 'none',
                cursor: isRunning ? 'pointer' : 'default'
            }}
            onClick={(e) => {
                if (!isRunning) return;
                e.preventDefault();
                e.stopPropagation();
                
                const currentVal = localValueRef.current;
                const isRight = currentVal === "1" || currentVal === "true";
                const newVal = isRight ? "0" : "1";
                
                console.log(`[SlideSwitchUI] Overlay Clicked. isRight=${isRight}, newVal=${newVal}`);

                setLocalValue(newVal);
                localValueRef.current = newVal;
                
                if (onInteract) {
                    onInteract(newVal === "1" ? 'set_1' : 'set_0');
                } else {
                    console.warn(`[SlideSwitchUI] No onInteract available to dispatch!`);
                }
            }}
        >
            <div style={{ 
                pointerEvents: 'none', 
                position: 'relative', 
                width: nativeW, 
                height: nativeH, 
                transform: `scale(${scaleX}, ${scaleY})`, 
                transformOrigin: '0 0' 
            }}>
                {React.createElement('wokwi-slide-switch', {
                    ref: elRef,
                    ...restAttrs,
                    style: { 
                        ...attrs.style, 
                        display: 'block',
                        width: nativeW,
                        height: nativeH
                    }
                })}
            </div>
            {/* Transparent overlay to catch ALL clicks before the web component eats them */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} />
        </div>
    );
};
