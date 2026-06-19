import React from 'react';

// Bounds match the width and height defined in manifest.json
export const BOUNDS = { x: 0, y: 0, w: 76, h: 113 };

export const Wokwi7SegmentUI = ({ state, attrs }: { state: any, attrs: any }) => {
    // Parse attributes
    const digits = parseInt(attrs?.digits || '1', 10);
    const hasColon = attrs?.colon === '1' || attrs?.colon === 'true';
    const activeColor = attrs?.color || '#FFA500'; // Default to orange if unspecified, but use user's color if provided. Wait, manifest defaults to "red".
    const offColor = '#505355'; // Dark gray for off state
    const background = attrs?.background || '#252626'; // Base fill
    
    // Fallback to active color provided by user/manifest.
    const glowColor = activeColor === 'red' ? '#FF3333' : activeColor;

    const getFill = (digitIndex: number, segLetter: string) => {
        return state?.digitSegments?.[digitIndex]?.[segLetter] ? glowColor : offColor;
    };

    const renderDigit = (x: number, digitIndex: number) => {
        return (
            <g transform={`translate(${x}, 0)`}>
                {/* DP */}
                <circle cx="62" cy="91" r="4" fill={getFill(digitIndex, 'DP')} />
                
                {/* A */}
                <polygon points="28.6,18.9 25.6,21.4 29.6,26.3 57.2,26.3 63.3,21.2 61.4,18.9" fill={getFill(digitIndex, 'A')} />
                {/* B */}
                <polygon points="60.7,52.4 65.7,24 64.5,22.6 57.4,28.5 53.4,51.4 56.8,55.5" fill={getFill(digitIndex, 'B')} />
                {/* C */}
                <polygon points="54.2,89 59.1,61.2 56.6,58.1 51.4,62.5 47.3,85.5 51.9,91" fill={getFill(digitIndex, 'C')} />
                {/* D */}
                <polygon points="47.6,94.5 50.4,92.1 46.2,87.1 19.9,87.1 13.7,92.3 15.5,94.5" fill={getFill(digitIndex, 'D')} />
                {/* E */}
                <polygon points="19,57.9 14.5,61.6 10,87.1 10,87.1 9.9,87.7 12.5,90.9 17.6,86.6 22,61.5" fill={getFill(digitIndex, 'E')} />
                {/* F */}
                <polygon points="24.1,22.6 20.9,25.3 16.3,51.7 19.3,55.3 23.8,51.5 28.1,27.3" fill={getFill(digitIndex, 'F')} />
                {/* G */}
                <polygon points="52.2,52.9 25,52.9 20.4,56.7 23.4,60.3 51.1,60.3 55.4,56.7" fill={getFill(digitIndex, 'G')} />
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
                viewBox="0 0 76 113"
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block', overflow: 'visible' }}
            >
                {/* Base Rectangle */}
                <rect x="0" y="0" width="76" height="113" rx="3" fill={background} />

                {/* Pin holes to emulate the eSim-Cloud visual style */}
                <g fill="#505355">
                    <circle cx="7" cy="11" r="2" />
                    <circle cx="22" cy="11" r="2" />
                    <circle cx="37" cy="11" r="2" />
                    <circle cx="52" cy="11" r="2" />
                    <circle cx="68" cy="11" r="2" />
                    
                    <circle cx="7" cy="102" r="2" />
                    <circle cx="22" cy="102" r="2" />
                    <circle cx="37" cy="102" r="2" />
                    <circle cx="52" cy="102" r="2" />
                    <circle cx="68" cy="102" r="2" />
                </g>

                {/* Render Digits */}
                {Array.from({ length: digits }).map((_, i) => 
                    renderDigit(i * 76, i)
                )}
            </svg>
        </div>
    );
};
