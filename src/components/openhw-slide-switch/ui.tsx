import React, { useLayoutEffect, useState, useRef } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 45, h: 32 };

export const SlideSwitchUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const { value: attrValue, onInteract } = attrs;
    const simValue = state?.value ?? attrValue ?? "0";

    const [localValue, setLocalValue] = useState<string>(String(simValue));
    const localValueRef = useRef(localValue);

    useLayoutEffect(() => {
        const newVal = String(simValue);
        if (newVal !== localValueRef.current) {
            setLocalValue(newVal);
            localValueRef.current = newVal;
        }
    }, [simValue]);

    const isRight = localValue === "1" || localValue === "true";

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
                
                const currentIsRight = localValueRef.current === "1" || localValueRef.current === "true";
                const newVal = currentIsRight ? "0" : "1";

                setLocalValue(newVal);
                localValueRef.current = newVal;
                
                if (onInteract) {
                    onInteract(newVal === "1" ? 'set_1' : 'set_0');
                } else {
                    console.warn(`[SlideSwitchUI] No onInteract available to dispatch!`);
                }
            }}
        >
            <svg
                width={BOUNDS.w}
                height={BOUNDS.h}
                viewBox={`0 0 ${BOUNDS.w} ${BOUNDS.h}`}
                style={{ display: 'block', pointerEvents: 'none', overflow: 'visible' }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <rect x="3" y="4" width="39" height="18" rx="2" fill="#eef2f7" stroke="#94a3b8" strokeWidth="1" />
                <rect x="8" y="8" width="29" height="10" rx="1.5" fill="#334155" />
                <rect x={isRight ? 24 : 11} y="6" width="11" height="14" rx="2" fill="#111827" />
                {[7.5, 22.5, 37.5].map((x) => (
                    <g key={x}>
                        <line x1={x} y1="22" x2={x} y2="32" stroke="#b8b8b8" strokeWidth="3" strokeLinecap="round" />
                        <rect x={x - 3} y="29" width="6" height="6" rx="1" fill="#d9a21b" stroke="#7c4f08" strokeWidth="0.7" />
                    </g>
                ))}
            </svg>
            {/* Transparent overlay to catch ALL clicks before the web component eats them */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} />
        </div>
    );
};
