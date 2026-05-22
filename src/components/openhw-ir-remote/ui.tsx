import React from 'react';

// Common Button Component
const RemoteButton = ({ cx, cy, r=16, fill, stroke, textColor, text, icon, onClick, buttonName, pressed }) => {
    return (
        <g 
            transform={`translate(${cx}, ${cy}) ${pressed ? 'scale(0.95)' : ''}`} 
            style={{cursor: 'pointer'}}
            onClick={() => onClick(buttonName)}
            onMouseDown={(e) => e.preventDefault()}
        >
            <circle cx="0" cy="0" r={r} fill={fill} stroke={stroke} strokeWidth="1" />
            {text && (
                <text x="0" y="4" textAnchor="middle" fill={textColor} fontSize="12" fontWeight="bold" fontFamily="sans-serif">
                    {text}
                </text>
            )}
            {icon && icon}
        </g>
    );
};

export const IRRemoteUI = ({ state, onEvent }) => {
    const handlePress = (btnName) => {
        onEvent({ type: 'button_press', button: btnName });
    };

    const isPressed = (btnName) => state.lastCommand === btnName; // Simple visualization, it won't unpress automatically, but good enough for click effect

    // Helpers for icons
    const PowerIcon = <path d="M-4,-4 A 6 6 0 1 0 4,-4 M0,-7 L0,1" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />;
    const PlusIcon = <path d="M-6,0 L6,0 M0,-6 L0,6" fill="none" stroke="white" strokeWidth="2" />;
    const MinusIcon = <path d="M-6,0 L6,0" fill="none" stroke="white" strokeWidth="2" />;
    const PlayIcon = <path d="M-4,-5 L5,0 L-4,5 Z" fill="black" />;
    const PrevIcon = <g fill="white"><path d="M4,-5 L-3,0 L4,5 Z" /><rect x="-5" y="-5" width="2" height="10" /></g>;
    const NextIcon = <g fill="white"><path d="M-4,-5 L3,0 L-4,5 Z" /><rect x="3" y="-5" width="2" height="10" /></g>;
    const BackIcon = <path d="M4,4 A 6 6 0 0 0 4,-6 L-4,-6 L-1,-9 M-4,-6 L-1,-3" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />;

    return (
        <svg width="130" height="310" viewBox="0 0 130 310">
            {/* Body */}
            <rect x="2" y="2" width="126" height="306" rx="15" fill="#f4f4f4" stroke="#2a2a2a" strokeWidth="4" />
            
            {/* Row 1: Power, Menu */}
            <RemoteButton cx={25} cy={35} fill="#e32626" stroke="#b31212" icon={PowerIcon} onClick={handlePress} buttonName="Power" pressed={isPressed('Power')} />
            <RemoteButton cx={105} cy={35} fill="white" stroke="#333" textColor="#e32626" text="MENU" onClick={handlePress} buttonName="Menu" pressed={isPressed('Menu')} />
            
            {/* Row 2: Test, +, Back */}
            <RemoteButton cx={25} cy={75} fill="white" stroke="#333" textColor="#e32626" text="TEST" onClick={handlePress} buttonName="Test" pressed={isPressed('Test')} />
            <RemoteButton cx={65} cy={75} fill="#1a1a1a" stroke="#000" icon={PlusIcon} onClick={handlePress} buttonName="Plus" pressed={isPressed('Plus')} />
            <RemoteButton cx={105} cy={75} fill="white" stroke="#333" icon={BackIcon} onClick={handlePress} buttonName="Back" pressed={isPressed('Back')} />
            
            {/* Row 3: Prev, Play, Next */}
            <RemoteButton cx={25} cy={115} fill="#1a1a1a" stroke="#000" icon={PrevIcon} onClick={handlePress} buttonName="Previous" pressed={isPressed('Previous')} />
            <RemoteButton cx={65} cy={115} fill="white" stroke="#333" icon={PlayIcon} onClick={handlePress} buttonName="Play" pressed={isPressed('Play')} />
            <RemoteButton cx={105} cy={115} fill="#1a1a1a" stroke="#000" icon={NextIcon} onClick={handlePress} buttonName="Next" pressed={isPressed('Next')} />
            
            {/* Row 4: 0, -, C */}
            <RemoteButton cx={25} cy={155} fill="white" stroke="#333" textColor="#0a5eb0" text="0" onClick={handlePress} buttonName="0" pressed={isPressed('0')} />
            <RemoteButton cx={65} cy={155} fill="#1a1a1a" stroke="#000" icon={MinusIcon} onClick={handlePress} buttonName="Minus" pressed={isPressed('Minus')} />
            <RemoteButton cx={105} cy={155} fill="white" stroke="#333" textColor="#0a5eb0" text="C" onClick={handlePress} buttonName="C" pressed={isPressed('C')} />
            
            {/* Row 5: 1, 2, 3 */}
            <RemoteButton cx={25} cy={195} fill="white" stroke="#333" textColor="#0a5eb0" text="1" onClick={handlePress} buttonName="1" pressed={isPressed('1')} />
            <RemoteButton cx={65} cy={195} fill="white" stroke="#333" textColor="#0a5eb0" text="2" onClick={handlePress} buttonName="2" pressed={isPressed('2')} />
            <RemoteButton cx={105} cy={195} fill="white" stroke="#333" textColor="#0a5eb0" text="3" onClick={handlePress} buttonName="3" pressed={isPressed('3')} />
            
            {/* Row 6: 4, 5, 6 */}
            <RemoteButton cx={25} cy={235} fill="white" stroke="#333" textColor="#0a5eb0" text="4" onClick={handlePress} buttonName="4" pressed={isPressed('4')} />
            <RemoteButton cx={65} cy={235} fill="white" stroke="#333" textColor="#0a5eb0" text="5" onClick={handlePress} buttonName="5" pressed={isPressed('5')} />
            <RemoteButton cx={105} cy={235} fill="white" stroke="#333" textColor="#0a5eb0" text="6" onClick={handlePress} buttonName="6" pressed={isPressed('6')} />
            
            {/* Row 7: 7, 8, 9 */}
            <RemoteButton cx={25} cy={275} fill="white" stroke="#333" textColor="#0a5eb0" text="7" onClick={handlePress} buttonName="7" pressed={isPressed('7')} />
            <RemoteButton cx={65} cy={275} fill="white" stroke="#333" textColor="#0a5eb0" text="8" onClick={handlePress} buttonName="8" pressed={isPressed('8')} />
            <RemoteButton cx={105} cy={275} fill="white" stroke="#333" textColor="#0a5eb0" text="9" onClick={handlePress} buttonName="9" pressed={isPressed('9')} />

            {/* Hidden interactive pins container if needed, OpenHW simulator automatically draws pins based on manifest */}
        </svg>
    );
};
