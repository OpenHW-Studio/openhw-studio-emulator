import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 60, h: 15 };

const bandColors: { [key: number]: string } = {
  [-2]: '#C3C7C0', // Silver
  [-1]: '#F1D863', // Gold
  0: '#000000', // Black
  1: '#8F4814', // Brown
  2: '#FB0000', // Red
  3: '#FC9700', // Orange
  4: '#FCF800', // Yellow
  5: '#00B800', // Green
  6: '#0000FF', // Blue
  7: '#A803D6', // Violet
  8: '#808080', // Gray
  9: '#FCFCFC', // White
};

function breakValue(value: number) {
    const exponent =
      value >= 1e10 ? 9 :
      value >= 1e9 ? 8 :
      value >= 1e8 ? 7 :
      value >= 1e7 ? 6 :
      value >= 1e6 ? 5 :
      value >= 1e5 ? 4 :
      value >= 1e4 ? 3 :
      value >= 1e3 ? 2 :
      value >= 1e2 ? 1 :
      value >= 1e1 ? 0 :
      value >= 1 ? -1 : -2;
    const base = Math.round(value / (10 ** exponent));
    if (value === 0) {
      return [0, 0];
    }
    return [Math.round(base % 100), exponent];
}

export const ResistorUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const value = attrs?.value || '1000';
    const numValue = parseFloat(value) || 1000;
    
    const [base, exponent] = breakValue(numValue);
    const band1Color = bandColors[Math.floor(base / 10)] || '#000000';
    const band2Color = bandColors[base % 10] || '#000000';
    const band3Color = bandColors[exponent] || '#000000';
    
    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, pointerEvents: 'none' }}>
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 15.645 3"
                preserveAspectRatio="xMidYMid meet"
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block', overflow: 'visible' }}
            >
                <defs>
                    <linearGradient
                        id="resistor-grad"
                        x2="0"
                        y1="22.332"
                        y2="38.348"
                        gradientTransform="matrix(.14479 0 0 .14479 -23.155 -4.0573)"
                        gradientUnits="userSpaceOnUse"
                        spreadMethod="reflect"
                    >
                        <stop stopColor="#323232" offset="0" />
                        <stop stopColor="#fff" stopOpacity=".42268" offset="1" />
                    </linearGradient>
                    <path
                        id="resistor-body"
                        d="m4.6918 0c-1.0586 0-1.9185 0.67468-1.9185 1.5022 0 0.82756 0.85995 1.4978 1.9185 1.4978 0.4241 0 0.81356-0.11167 1.1312-0.29411h4.0949c0.31802 0.18313 0.71075 0.29411 1.1357 0.29411 1.0586 0 1.9185-0.67015 1.9185-1.4978 0-0.8276-0.85995-1.5022-1.9185-1.5022-0.42499 0-0.81773 0.11098-1.1357 0.29411h-4.0949c-0.31765-0.18244-0.7071-0.29411-1.1312-0.29411z"
                    />
                    <clipPath id="resistor-clip">
                        <use href="#resistor-body" />
                    </clipPath>
                </defs>
                
                {/* Wires */}
                <rect y="1.1759" width="15.558" height=".63826" fill="#aaa" />
                
                {/* Body */}
                <g strokeWidth=".14479" fill="#d5b597">
                    <use href="#resistor-body" />
                    <use href="#resistor-body" fill="url(#resistor-grad)" opacity=".44886" />
                    
                    {/* Bands */}
                    <rect x="4" y="0" width="1" height="3" fill={band1Color} clipPath="url(#resistor-clip)" />
                    <path d="m6 0.29411v2.4117h0.96v-2.4117z" fill={band2Color} />
                    <path d="m7.8 0.29411v2.4117h0.96v-2.4117z" fill={band3Color} />
                    <rect x="10.69" y="0" width="1" height="3" fill="#F1D863" clipPath="url(#resistor-clip)" />
                </g>
            </svg>
        </div>
    );
};
