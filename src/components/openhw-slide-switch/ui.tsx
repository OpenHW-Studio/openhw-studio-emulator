import React, { useRef, useLayoutEffect, useEffect, useState } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 34, h: 32 };

export const SlideSwitchUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const elRef = useRef<any>(null);

    const nativeW = 34;
    const nativeH = 32;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    const isDraggingRef = useRef(false);

    const { value: attrValue, onInteract, ...restAttrs } = attrs;
    const simValue = state?.value ?? attrValue ?? "";

    // Track local switch state for immediate visual feedback
    const [localValue, setLocalValue] = useState<string>(String(simValue));
    const localValueRef = useRef(localValue);

    // Sync local value from simulation state
    useLayoutEffect(() => {
        const newVal = String(simValue);
        if (!isDraggingRef.current && newVal !== localValueRef.current) {
            setLocalValue(newVal);
            localValueRef.current = newVal;
        }
    }, [simValue]);

    // Sync value property to the wokwi element
    useLayoutEffect(() => {
        if (elRef.current) {
            // The wokwi element expects 0 or 1 (number) for its value property
            const numVal = localValue === "1" || localValue === "true" ? 1 : 0;
            elRef.current.value = numVal;
        }
    }, [localValue]);

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

    // Listen for 'input' and 'change' events from the wokwi-slide-switch element
    useLayoutEffect(() => {
        const el = elRef.current;
        if (!el) return;

        const handleInput = (e: any) => {
            if (!onInteract) return;

            // The wokwi-slide-switch dispatches InputEvent('input') after toggling.
            // The element's .value property is set to 0 or 1 (number).
            // InputEvent doesn't carry 'detail', so we read from the element directly.
            let val: any = undefined;

            // Try e.detail first (in case a future version uses CustomEvent)
            if (typeof e.detail === 'string' || typeof e.detail === 'number') {
                val = e.detail;
            }
            // Read from the element's value property
            else if (el.value !== undefined) {
                val = el.value;
            }
            // Fallback: try e.target.value
            else if (e.target && e.target.value !== undefined) {
                val = e.target.value;
            }

            if (val !== undefined) {
                const strVal = String(val);
                // Update local state immediately for visual feedback
                setLocalValue(strVal);
                localValueRef.current = strVal;
                // Notify the simulation
                onInteract({ type: 'input', value: strVal });
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
            {React.createElement('wokwi-slide-switch', {
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
