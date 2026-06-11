import React from 'react';

// Bounds match the width and height defined in manifest.json
export const BOUNDS = { x: 0, y: 0, w: 50, h: 90 };

export const Wokwi7SegmentUI = ({ state, attrs }: { state: any, attrs: any }) => {
    // Parse attributes
    const digits = parseInt(attrs?.digits || '1', 10);
    const hasColon = attrs?.colon === '1' || attrs?.colon === 'true';
    const activeColor = attrs?.color || 'red';
    const offColor = '#333333';
    const pinsAttr = attrs?.pins || 'extend'; // 'top', 'extend', 'none'
    const background = attrs?.background || '#1e1e1e';

    const yOffset = pinsAttr === 'extend' ? 2 : 0;
    const width = 12.55 * digits;
    const height = pinsAttr === 'extend' ? 23 : 22;

    const getFill = (digitIndex: number, segLetter: string) => {
        return state?.digitSegments?.[digitIndex]?.[segLetter] ? activeColor : offColor;
    };

    const renderDigit = (x: number, digitIndex: number) => {
        return (
            <React.Fragment key={digitIndex}>
                <g transform={`skewX(-8) translate(${x}, ${yOffset + 2.4}) scale(0.81)`}>
                    <polygon points="2 0 8 0 9 1 8 2 2 2 1 1" fill={getFill(digitIndex, 'A')} />
                    <polygon points="10 2 10 8 9 9 8 8 8 2 9 1" fill={getFill(digitIndex, 'B')} />
                    <polygon points="10 10 10 16 9 17 8 16 8 10 9 9" fill={getFill(digitIndex, 'C')} />
                    <polygon points="8 18 2 18 1 17 2 16 8 16 9 17" fill={getFill(digitIndex, 'D')} />
                    <polygon points="0 16 0 10 1 9 2 10 2 16 1 17" fill={getFill(digitIndex, 'E')} />
                    <polygon points="0 8 0 2 1 1 2 2 2 8 1 9" fill={getFill(digitIndex, 'F')} />
                    <polygon points="2 8 8 8 9 9 8 10 2 10 1 9" fill={getFill(digitIndex, 'G')} />
                </g>
                <circle cx={x + 7.4} cy={yOffset + 16} r="0.89" fill={getFill(digitIndex, 'DP')} />
            </React.Fragment>
        );
    };

    const renderColon = () => {
        const colonPosition = 1.5 + 12.7 * Math.round(digits / 2);
        const colonFill = state?.colon ? activeColor : offColor;
        return (
            <g transform="skewX(-8)" fill={colonFill}>
                <circle cx={colonPosition} cy={yOffset + 5.75} r="0.89" />
                <circle cx={colonPosition} cy={yOffset + 13.25} r="0.89" />
            </g>
        );
    };

    const getPinPositions = () => {
        const numPins = digits === 4 ? 14 : digits === 3 ? 12 : 10;
        const cols = Math.ceil(numPins / 2);
        return {
            startX: (12.55 * digits - cols * 2.54) / 2,
            bottomY: pinsAttr === 'extend' ? 21 : 18,
            cols,
        };
    };

    const renderPins = () => {
        const { cols, bottomY, startX } = getPinPositions();
        return (
            <g fill="url(#pin-pattern)" transform={`translate(${startX}, 0)`}>
                <rect height="2" width={cols * 2.54} />
                <rect height="2" width={cols * 2.54} transform={`translate(0, ${bottomY})`} />
            </g>
        );
    };

    return (
        <div style={{
            pointerEvents: 'none',
            width: '100%',
            height: '100%',
            position: 'relative'
        }}>
            <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${width} ${height}`}
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block' }}
            >
                <defs>
                    <pattern id="pin-pattern" height="2" width="2.54" patternUnits="userSpaceOnUse">
                        {pinsAttr === 'extend' ? (
                            <rect x="1.02" y="0" height="2" width="0.5" fill="#aaa" />
                        ) : (
                            <circle cx="1.27" cy="1" r="0.5" fill="#aaa" />
                        )}
                    </pattern>
                    <style>{`
                        polygon {
                            transform: scale(0.9);
                            transform-origin: 50% 50%;
                            transform-box: fill-box;
                        }
                    `}</style>
                </defs>
                
                {/* Background Base */}
                <rect x="0" y={yOffset} width={width} height="20.5" fill={background} />
                
                {/* Render Digits */}
                {Array.from({ length: digits }).map((_, i) => 
                    renderDigit(3.5 + i * 12.7, i)
                )}
                
                {/* Render Colon */}
                {hasColon && digits >= 2 ? renderColon() : null}
                
                {/* Render Pins visually */}
                {pinsAttr !== 'none' ? renderPins() : null}
            </svg>
        </div>
    );
};
