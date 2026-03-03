import React, { useRef, useLayoutEffect } from 'react';

export const PotentiometerUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const elRef = useRef<any>(null);

    useLayoutEffect(() => {
        const el = elRef.current;
        if (!el) return;

        const handleInput = (e: any) => {
            if (attrs.onInteract) {
                attrs.onInteract({ type: 'input', value: e.target.value });
            }
        };

        el.addEventListener('input', handleInput);
        return () => el.removeEventListener('input', handleInput);
    }, [attrs.onInteract]);

    return (
        <div style={{ pointerEvents: 'auto' }}>
            {React.createElement('wokwi-potentiometer', {
                ref: elRef,
                value: state?.value ?? attrs?.value ?? 50,
                ...attrs,
                style: { ...attrs.style, pointerEvents: 'auto' }
            })}
        </div>
    );
};
