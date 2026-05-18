import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';

const BTN_COLORS = [
    { label: 'Green', value: 'green', hex: '#22c55e' },
    { label: 'Red', value: 'red', hex: '#ef4444' },
    { label: 'Blue', value: 'blue', hex: '#3b82f6' },
    { label: 'Yellow', value: 'yellow', hex: '#eab308' },
    { label: 'White', value: 'white', hex: '#f1f5f9' },
    { label: 'Black', value: 'black', hex: '#1e293b' },
];

export const PushbuttonContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => {
    const current = attrs?.color ?? 'green';
    return (
        <>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Color:</span>
            <select
                value={current}
                onChange={e => onUpdate('color', e.target.value)}
                style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
            >
                {BTN_COLORS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                ))}
            </select>
        </>
    );
};

// Bounding box for the blue selection ring.
// x, y: offset from comp.x/comp.y (top-left corner of the visual area)
// w, h: width and height of the visual area
export const BOUNDS = { x: 0, y: 0, w: 68, h: 44 };

export const PushbuttonUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const [buttonElement, setButtonElement] = useState<any>(null);

    // Local animation state for immediate feedback
    const [isPressed, setIsPressed] = useState(false);
    const isPressedRef = useRef(false);
    const attrsRef = useRef(attrs);

    useLayoutEffect(() => {
        attrsRef.current = attrs;
    });

    const nativeW = 68;
    const nativeH = 44;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    const color = attrs?.color || 'green';
    const targetKey = attrs?.key;

    // Use local state as the primary source of truth for user interaction.
    // This decouples the visual UI state from delayed/echoed worker messages, eliminating stickiness.
    const pressed = isPressed;

    // 1. Sync properties directly to the wokwi-pushbutton element (exactly like velxio-master)
    useLayoutEffect(() => {
        if (buttonElement) {
            buttonElement.color = color;
            buttonElement.pressed = pressed;
            if (targetKey) {
                buttonElement.key = String(targetKey);
                buttonElement.setAttribute('key', String(targetKey));
            }
        }
    }, [buttonElement, color, pressed, targetKey]);

    // Stable deduplicated handlers for press and release
    const handlePress = (source: string) => {
        console.log(`[Pushbutton UI Press] ID: ${attrsRef.current?.id || 'unknown'}, Source: ${source}, TargetKey: ${targetKey}, Current pressed: ${isPressedRef.current}`);
        if (isPressedRef.current) {
            return;
        }
        isPressedRef.current = true;
        setIsPressed(true);
        if (attrsRef.current?.onInteract) {
            attrsRef.current.onInteract('press');
        }
    };

    const handleRelease = (source: string) => {
        console.log(`[Pushbutton UI Release] ID: ${attrsRef.current?.id || 'unknown'}, Source: ${source}, TargetKey: ${targetKey}, Current pressed: ${isPressedRef.current}`);
        if (!isPressedRef.current) {
            return;
        }
        isPressedRef.current = false;
        setIsPressed(false);
        if (attrsRef.current?.onInteract) {
            attrsRef.current.onInteract('release');
        }
    };

    // 2. Listen for 'button-press' and 'button-release' custom events from wokwi-pushbutton
    useEffect(() => {
        if (!buttonElement) return;

        const onBtnPress = () => handlePress('button-press');
        const onBtnRelease = () => handleRelease('button-release');

        buttonElement.addEventListener('button-press', onBtnPress);
        buttonElement.addEventListener('button-release', onBtnRelease);

        return () => {
            buttonElement.removeEventListener('button-press', onBtnPress);
            buttonElement.removeEventListener('button-release', onBtnRelease);
        };
    }, [buttonElement]);

    // 3. Window keyboard listeners for robust key interactivity
    useEffect(() => {
        if (!isRunning || !targetKey) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            console.log(`[Pushbutton UI KeyDown Event] ID: ${attrsRef.current?.id || 'unknown'}, Key: ${e.key}, TargetKey: ${targetKey}`);
            if (e.repeat) return;
            const k = e.key;
            const t = String(targetKey);
            let match = false;
            if (k.toLowerCase() === t.toLowerCase()) match = true;
            else if (t.toLowerCase() === 'space' && k === ' ') match = true;

            if (match) {
                console.log(`[Pushbutton UI KeyDown MATCH] ID: ${attrsRef.current?.id || 'unknown'}, Key: ${e.key}, TargetKey: ${targetKey}`);
                handlePress('keydown');
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            console.log(`[Pushbutton UI KeyUp Event] ID: ${attrsRef.current?.id || 'unknown'}, Key: ${e.key}, TargetKey: ${targetKey}`);
            const k = e.key;
            const t = String(targetKey);
            let match = false;
            if (k.toLowerCase() === t.toLowerCase()) match = true;
            else if (t.toLowerCase() === 'space' && k === ' ') match = true;

            if (match) {
                console.log(`[Pushbutton UI KeyUp MATCH] ID: ${attrsRef.current?.id || 'unknown'}, Key: ${e.key}, TargetKey: ${targetKey}`);
                handleRelease('keyup');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isRunning, targetKey]); // Only re-run when simulation state or targetKey changes

    return (
        <div style={{ 
            pointerEvents: 'none', 
            position: 'absolute', 
            inset: 0,
            width: BOUNDS.w,
            height: BOUNDS.h
        }}>
            <div
                className={`btn-wrapper ${pressed ? 'pressed' : ''}`}
                style={{
                    position: 'relative',
                    width: nativeW,
                    height: nativeH,
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '0 0',
                    cursor: 'pointer',
                    pointerEvents: isRunning ? 'auto' : 'none'
                }}>
                <wokwi-pushbutton
                    ref={setButtonElement}
                    style={{ pointerEvents: isRunning ? 'auto' : 'none', display: 'block', width: nativeW, height: nativeH }}
                />
            </div>
        </div>
    );
};
