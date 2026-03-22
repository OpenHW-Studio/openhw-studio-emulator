import React, { useEffect, useRef } from 'react';
import manifest from './manifest.json';

export const BOUNDS = { x: 0, y: 0, w: manifest.width, h: manifest.height };

export const MembraneKeypadContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => (
    <>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Type:</span>
        <select
            value={typeof attrs?.keys === 'string' ? attrs.keys : 'custom'}
            onChange={e => {
                if (e.target.value === 'custom') {
                    onUpdate('keys', ["1", "2", "3", "+", "4", "5", "6", "-", "7", "8", "9", "*", ".", "0", "=", "/"]);
                } else {
                    onUpdate('keys', e.target.value);
                }
            }}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        >
            <option value="custom">Calculator (+-*/)</option>
            <option value="4x4">Standard 4x4 (A-D)</option>
            <option value="4x3">Standard 4x3</option>
        </select>
    </>
);

export const MembraneKeypadUI = ({ state, attrs, isRunning }: { state: any, attrs: any, isRunning: boolean }) => {
    const padRef = useRef<any>(null);

    useEffect(() => {
        if (!padRef.current) return;
        const el = padRef.current;

        const defaultKeys = ["1", "2", "3", "+", "4", "5", "6", "-", "7", "8", "9", "*", ".", "0", "=", "/"];

        const onDown = (e: any) => {
            const currentKeys = attrs?.keys || defaultKeys;
            const idx = currentKeys.indexOf(e.detail);
            if (isRunning && attrs.onInteract && idx !== -1) attrs.onInteract({ type: 'press', index: idx });
        };
        const onUp = (e: any) => {
            const currentKeys = attrs?.keys || defaultKeys;
            const idx = currentKeys.indexOf(e.detail);
            if (isRunning && attrs.onInteract && idx !== -1) attrs.onInteract({ type: 'release', index: idx });
        };

        el.addEventListener('button-press', onDown);
        el.addEventListener('button-release', onUp);


        return () => {
            el.removeEventListener('button-press', onDown);
            el.removeEventListener('button-release', onUp);
        };
    }, [isRunning, attrs]);

    const defaultKeys = ["1", "2", "3", "+", "4", "5", "6", "-", "7", "8", "9", "*", ".", "0", "=", "/"];

    return (

        
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, overflow: 'visible' }}>
            {React.createElement('wokwi-membrane-keypad', {
                ref: padRef,
                keys: attrs?.keys || defaultKeys,
                style: { pointerEvents: isRunning ? 'auto' : 'none', width: '100%', height: '100%' }
            })}
        </div>
    );
};