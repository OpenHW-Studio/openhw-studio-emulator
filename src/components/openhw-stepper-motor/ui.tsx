import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 345, h: 375 };
const mmToPix = 15 / 2.54; // Exact ratio for 15px pitch per 0.1 inch (2.54mm)

export const StepperMotorUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const angle = state?.angle ?? 0;
    const arrowColor = state?.arrow || attrs?.arrow || '#4a36ba';
    
    // NEMA 23 Default Spec
    const frameSize = 57.3;
    const holeRadius = 2.5;
    const shaftRadius = 6.35;
    const cornerRadius = 5;
    const cornerOffset = 5.5;
    const bodyRadius = 19.5;
    
    const halfShaft = shaftRadius / 2;
    const halfFrame = frameSize / 2;
    
    const innerHoleRadius = holeRadius * 0.9;
    const outerHoleRadius = holeRadius * 1.1;
    
    // shaft radius offset, needed for transform
    const rOff = Math.sqrt(0.75 * Math.pow(shaftRadius, 2));

    // Calculate exact offsets to snap the pins to exactly (150, 375), etc.
    const offsetX = 150 - (24.9 * mmToPix);
    const offsetY = 375 - (62.35 * mmToPix);

    const width = BOUNDS.w;
    const height = BOUNDS.h;

    return (
        <div style={{
            pointerEvents: 'none',
            width: BOUNDS.w,
            height: BOUNDS.h,
            position: 'relative'
        }}>
            <svg
                width={width}
                height={height}
                version="1.1"
                viewBox={`0 0 ${width} ${height}`}
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block', overflow: 'visible' }}
            >
                <defs>
                    <linearGradient
                        id="frame-gradient"
                        x1={`-${frameSize * 0.2}`}
                        x2={`${frameSize * 2}`}
                        y1={`${frameSize}`}
                        y2={`${frameSize}`}
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#666" offset="0" />
                        <stop stopColor="#fff" offset="1" />
                    </linearGradient>
                    <linearGradient
                        id="shaft-gradient"
                        x1="0"
                        x2="0"
                        y1="-5"
                        y2="5"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#9d9d9d" offset="0" />
                        <stop stopColor="#9d9d9d" stopOpacity="0" offset="1" />
                    </linearGradient>
                    <linearGradient
                        id="body-gradient"
                        x1={`${frameSize * 0.1}`}
                        x2={`${frameSize * 0.7}`}
                        y1={`${frameSize}`}
                        y2={`${frameSize}`}
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#9d9d9d" offset="0" />
                        <stop stopColor="#fdfafa" offset=".29501" />
                        <stop offset="1" stopColor="#2a2a2a" />
                    </linearGradient>
                    <path
                        id="pin"
                        transform={`translate(${halfFrame - 3.75} ${frameSize})`}
                        fill="#9f9f9f"
                        d="m 0 0 c .5 0 .5 0 .5 .5 v 4.55 c -.5 .5 -.5 .5 -1 0 v -4.5 c 0 -.5 0 -.5 .5 -.5"
                    />
                </defs>
                {/* Body */}
                <g transform={`translate(${offsetX},${offsetY})`}>
                    <g transform={`scale(${mmToPix})`}>
                        {/* Pins */}
                        <use href="#pin" x="0" />
                        <use href="#pin" x="2.54" />
                        <use href="#pin" x="5.08" />
                        <use href="#pin" x="7.62" />

                        <g strokeLinecap="round" strokeLinejoin="round">
                            <rect
                                width={frameSize}
                                height={frameSize}
                                rx={cornerRadius}
                                ry={cornerRadius}
                                fill="url(#frame-gradient)"
                                stroke="#000"
                                strokeWidth=".3245"
                            />
                            <circle cx={cornerOffset} cy={cornerOffset} r={outerHoleRadius} fill="#666" />
                            <circle cx={cornerOffset} cy={cornerOffset} r={innerHoleRadius} fill="#e6e6e6" />
                            <circle cx={frameSize - cornerOffset} cy={cornerOffset} r={outerHoleRadius} fill="#666" />
                            <circle cx={frameSize - cornerOffset} cy={cornerOffset} r={innerHoleRadius} fill="#e6e6e6" />
                            <circle cx={cornerOffset} cy={frameSize - cornerOffset} r={outerHoleRadius} fill="#666" />
                            <circle cx={cornerOffset} cy={frameSize - cornerOffset} r={innerHoleRadius} fill="#e6e6e6" />
                            <circle cx={frameSize - cornerOffset} cy={frameSize - cornerOffset} r={outerHoleRadius} fill="#666" />
                            <circle cx={frameSize - cornerOffset} cy={frameSize - cornerOffset} r={innerHoleRadius} fill="#e6e6e6" />
                        </g>

                        {/* motor body */}
                        <circle
                            cx={halfFrame}
                            cy={halfFrame}
                            r={bodyRadius}
                            fill="#868686"
                            fillOpacity=".89602"
                            opacity=".73"
                            stroke="url(#body-gradient)"
                            strokeWidth="1.41429"
                        />
                        {/* Rotator */}
                        <g>
                            <path
                                id="arrow-path"
                                transform={`rotate(${angle}, ${halfFrame},${halfFrame}) translate(${halfFrame} ${halfFrame})`}
                                fill={arrowColor}
                                d={`m 0 0 l -${shaftRadius} 0 l ${shaftRadius} -${halfFrame - 3} l ${shaftRadius} ${halfFrame - 3} z`}
                            />
                            <path
                                id="shaft-path"
                                transform={`translate(${halfFrame}, ${halfFrame}) rotate(${angle}) translate(0, 0)`}
                                d={`m -${halfShaft} -${rOff} a ${shaftRadius} ${shaftRadius} 0 1 0 ${shaftRadius} 0 z`}
                                fill="#4d4d4d"
                                stroke="url(#shaft-gradient)"
                                strokeWidth=".57968"
                            />
                        </g>
                    </g>
                </g>
            </svg>
        </div>
    );
};
