import React from 'react';

// Bounds match the width and height defined in manifest.json
export const BOUNDS = { x: 0, y: 0, w: 60, h: 90 };

export const Wokwi7SegmentUI = ({ state, attrs }: { state: any, attrs: any }) => {
    // Parse attributes
    const digits = parseInt(attrs?.digits || '1', 10);
    const hasColon = attrs?.colon === '1' || attrs?.colon === 'true';
    const activeColor = attrs?.color || 'red';
    const offColor = '#333333';
    const pinsAttr = attrs?.pins || 'extend'; // 'top', 'extend', 'none'
    const background = attrs?.background || '#1e1e1e';

    const getFill = (digitIndex: number, segLetter: string) => {
        return state?.digitSegments?.[digitIndex]?.[segLetter] ? activeColor : offColor;
    };

    const renderDigit = (x: number, digitIndex: number) => {
        return (
            <React.Fragment key={digitIndex}>
                <g transform={`skewX(-8) translate(${x}, 0) scale(0.81)`}>
                    <polygon points="2 0 8 0 9 1 8 2 2 2 1 1" fill={getFill(digitIndex, 'A')} />
                    <polygon points="10 2 10 8 9 9 8 8 8 2 9 1" fill={getFill(digitIndex, 'B')} />
                    <polygon points="10 10 10 16 9 17 8 16 8 10 9 9" fill={getFill(digitIndex, 'C')} />
                    <polygon points="8 18 2 18 1 17 2 16 8 16 9 17" fill={getFill(digitIndex, 'D')} />
                    <polygon points="0 16 0 10 1 9 2 10 2 16 1 17" fill={getFill(digitIndex, 'E')} />
                    <polygon points="0 8 0 2 1 1 2 2 2 8 1 9" fill={getFill(digitIndex, 'F')} />
                    <polygon points="2 8 8 8 9 9 8 10 2 10 1 9" fill={getFill(digitIndex, 'G')} />
                </g>
                <circle cx={x + 7.4} cy={13.6} r="0.89" fill={getFill(digitIndex, 'DP')} />
            </React.Fragment>
        );
    };

    const renderPins = () => {
        const pinXs = [0, 15, 30, 45, 60];
        return (
            <g fill="#aaa">
                {pinXs.map(x => (
                    <React.Fragment key={x}>
                        {/* Top pin */}
                        <rect x={x - 2} y={0} width={4} height={15} rx={1} />
                        {/* Bottom pin */}
                        <rect x={x - 2} y={75} width={4} height={15} rx={1} />
                    </React.Fragment>
                ))}
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
                viewBox="0 0 60 90"
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block', overflow: 'visible' }}
            >
                <style>{`
                    polygon {
                        transform: scale(0.9);
                        transform-origin: 50% 50%;
                        transform-box: fill-box;
                    }
                `}</style>
                
                {/* Render Pins visually */}
                {pinsAttr !== 'none' ? renderPins() : null}

                {/* Background Base */}
                <rect x="-3" y="10" width="66" height="70" rx="4" fill={background} />
                
                {/* Render Digits */}
                <g transform="translate(13, 14) scale(3.4)">
                    {Array.from({ length: digits }).map((_, i) => 
                        renderDigit(0, i)
                    )}
                </g>
            </svg>
        </div>
    );
};
