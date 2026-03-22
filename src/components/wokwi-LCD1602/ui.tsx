import React, { useState } from 'react';

export const LCD1602ContextMenu = ({ attrs, onUpdate }: { attrs: any, onUpdate: (key: string, value: any) => void }) => (
    <>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Backlight:</span>
        <select
            value={attrs?.backlight || 'green'}
            onChange={e => onUpdate('backlight', e.target.value)}
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
        >
            <option value="green">Green</option>
            <option value="blue">Blue</option>
            <option value="white">White</option>
        </select>
    </>
);

// Bounding box for the blue selection ring.
export const BOUNDS = { x: 0, y: 0, w: 120, h: 60 };

export const LCD1602UI = ({ state, attrs }: { state: any, attrs: any }) => {
    const displayBuffer = state?.displayBuffer || [
        Array(16).fill(' '),
        Array(16).fill(' ')
    ];
    const backlightOn = state?.backlightOn !== false;
    const displayOn = state?.displayOn !== false;
    const cursorOn = state?.cursorOn === true;
    const cursorRow = state?.cursorRow || 0;
    const cursorCol = state?.cursorCol || 0;
    const backlight = attrs?.backlight || 'green';

    const getBacklightColor = () => {
        switch (backlight) {
            case 'blue': return backlightOn ? '#001f3f' : '#0a0a0a';
            case 'white': return backlightOn ? '#f0f0f0' : '#1a1a1a';
            default: return backlightOn ? '#003300' : '#0a0a0a';
        }
    };

    const getTextColor = () => {
        return backlightOn ? '#00ff00' : '#333333';
    };

    return (
        <div style={{ position: 'relative', width: 120, height: 60 }}>
            <wokwi-lcd1602
                style={{ pointerEvents: 'none' }}
                {...attrs}
            />
            <div
                style={{
                    position: 'absolute',
                    top: '38.8px',
                    left: '28.4px',
                    width: '249.5px',
                    height: '60.5px',
                    backgroundColor: getBacklightColor(),
                    border: '2px solid #666',
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '4px',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: getTextColor(),
                    opacity: displayOn ? 1 : 0.3
                }}
            >
                {displayBuffer.map((line, lineIndex) => (
                    <div key={lineIndex} style={{ display: 'flex', alignItems: 'center', height: '18px' }}>
                        {line.map((char, charIndex) => (
                            <span
                                key={charIndex}
                                style={{
                                    display: 'inline-block',
                                    width: '6px',
                                    height: '10px',
                                    textAlign: 'center',
                                    backgroundColor: cursorOn && lineIndex === cursorRow && charIndex === cursorCol ? getTextColor() : 'transparent',
                                    color: cursorOn && lineIndex === cursorRow && charIndex === cursorCol ? getBacklightColor() : getTextColor(),
                                    animation: cursorOn && lineIndex === cursorRow && charIndex === cursorCol ? 'blink 1s infinite' : 'none'
                                }}
                            >
                                {char}
                            </span>
                        ))}
                    </div>
                ))}
            </div>
            <style jsx>{`
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
            `}</style>
        </div>
    );
};