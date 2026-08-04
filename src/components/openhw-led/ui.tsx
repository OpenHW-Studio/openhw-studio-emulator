import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 65.3, h: 65.3 };

const lightColors: Record<string, string> = {
  red: '#ff8080',
  green: '#80ff80',
  blue: '#8080ff',
  yellow: '#ffff80',
  orange: '#ffcf80',
  white: '#ffffff',
  purple: '#ff80ff',
};

const LED_SVG = ({ color, brightness, illuminated, id }: { color: string; brightness: number; illuminated: boolean; id?: string }) => {
    const b = Math.max(0, Math.min(1, brightness / 255));
    const lightOn = illuminated && b > Number.EPSILON;
    const lightColorActual = lightColors[color?.toLowerCase()] || color;
    const opacity = b ? 0.3 + b * 0.7 : 0;

    return (
        <svg width="100%" height="100%" style={{ overflow: 'visible' }} viewBox="0 0 65.3 72.4" version="1.2" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id={`light1-${id || 'default'}`} x="-0.8" y="-0.8" height="2.2" width="2.8">
                    <feGaussianBlur stdDeviation="2" />
                </filter>
                <filter id={`light2-${id || 'default'}`} x="-0.8" y="-0.8" height="2.2" width="2.8">
                    <feGaussianBlur stdDeviation="4" />
                </filter>
            </defs>

            {/* LED Legs perfectly aligned to 15px grid (Cathode at x=25.8, Anode at x=40.8) */}
            {/* Cathode leg (straight) */}
            <rect x="23.9" y="35.9" width="3.8" height="36.5" fill="#8c8c8c" />

            {/* Anode leg (bent) */}
            <g transform="translate(17.9, 9.6) scale(1.7647)">
                <path
                    d="m12.977 30.269c0-1.1736-0.86844-2.5132-1.8916-3.4024-0.41616-0.3672-1.1995-1.0015-1.1995-1.4249v-5.4706h-2.1614v5.7802c0 1.0584 0.94752 1.8785 1.9462 2.7482 0.44424 0.37584 1.3486 1.2496 1.3486 1.7694"
                    fill="#8c8c8c"
                />
            </g>
            <rect x="38.9" y="63.0" width="3.8" height="9.4" fill="#8c8c8c" />

            {/* LED Body and Dome group (centered at x=33.3, translated and scaled) */}
            <g transform="translate(20.8, 0) scale(1.7647)">
                {/* Wokwi LED dome / body outline */}
                <path
                    d="m14.173 13.001v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z"
                    opacity="0.3"
                />
                <path
                    d="m14.173 13.001v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z"
                    fill="#e6e6e6"
                    opacity="0.5"
                />
                <path
                    d="m14.173 13.001v3.1054c0 2.7389-3.1658 4.9651-7.0855 4.9651-3.9125 2e-5 -7.0877-2.219-7.0877-4.9651v4.6296c1.4738 1.6517 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8586l-4e-5 -1.5235c-7e-4 -1.1419-0.4744-2.2032-1.283-3.1054z"
                    fill="#d1d1d1"
                    opacity="0.9"
                />
                <g>
                    <path
                        d="m14.173 13.001v3.1054c0 2.7389-3.1658 4.9651-7.0855 4.9651-3.9125 2e-5 -7.0877-2.219-7.0877-4.9651v4.6296c1.4738 1.6517 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8586l-4e-5 -1.5235c-7e-4 -1.1419-0.4744-2.2032-1.283-3.1054z"
                        opacity="0.7"
                    />
                    <path
                        d="m14.173 13.001v3.1054c0 2.7389-3.1658 4.9651-7.0855 4.9651-3.9125 2e-5 -7.0877-2.219-7.0877-4.9651v3.1054c1.4738 1.6502 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8586-7.4e-4 -1.1412-0.47444-2.2025-1.283-3.1047z"
                        opacity="0.25"
                    />
                    <ellipse cx="7.0877" cy="16.106" rx="7.087" ry="4.9608" opacity="0.25" />
                </g>
                <polygon
                    points="2.2032 16.107 3.1961 16.107 3.1961 13.095 6.0156 13.095 10.012 8.8049 3.407 8.8049 2.2032 9.648"
                    fill="#666666"
                />
                <polygon
                    points="11.215 9.0338 7.4117 13.095 11.06 13.095 11.06 16.107 11.974 16.107 11.974 8.5241 10.778 8.5241"
                    fill="#666666"
                />

                {/* The main colored LED dome casing */}
                <path
                    d="m14.173 13.001v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z"
                    fill={color}
                    opacity="0.65"
                />

                {/* White reflector highlight */}
                <g fill="#ffffff">
                    <path
                        d="m10.388 3.7541 1.4364-0.2736c-0.84168-1.1318-2.0822-1.9577-3.5417-2.2385l0.25416 1.0807c0.76388 0.27072 1.4068 0.78048 1.8511 1.4314z"
                        opacity="0.5"
                    />
                    <path
                        d="m0.76824 19.926v1.5199c0.64872 0.5292 1.4335 0.97632 2.3076 1.3169v-1.525c-0.8784-0.33624-1.6567-0.78194-2.3076-1.3118z"
                        opacity="0.5"
                    />
                    <path
                        d="m11.073 20.21c-0.2556 0.1224-0.52992 0.22968-0.80568 0.32976-0.05832 0.01944-0.11736 0.04032-0.17784 0.05832-0.56376 0.17928-1.1614 0.31896-1.795 0.39456-0.07488 0.0094-0.1512 0.01872-0.22464 0.01944-0.3204 0.03024-0.64368 0.05832-0.97056 0.05832-0.14832 0-0.30744-0.01512-0.4716-0.02376-1.2002-0.05688-2.3306-0.31464-3.2976-0.73944l-2e-5 -8.3895v-4.8254c0-1.471 0.84816-2.7295 2.0736-3.3494l-0.02232-0.05328-1.2478-1.512c-1.6697 1.003-2.79 2.8224-2.79 4.9118v11.905c-0.04968-0.04968-0.30816-0.30888-0.48024-0.52992l-0.30744 0.6876c1.4011 1.4818 3.8088 2.4617 6.5426 2.4617 1.6798 0 3.2371-0.37368 4.5115-1.0022l-0.52704-0.40896-0.01006 0.0072z"
                        opacity="0.5"
                    />
                </g>

                {/* Glow when lit */}
                {lightOn && (
                    <g>
                        <ellipse
                            cx="8"
                            cy="10"
                            rx="10"
                            ry="10"
                            fill={lightColorActual}
                            filter={`url(#light2-${id || 'default'})`}
                            opacity={opacity}
                        />
                        <ellipse cx="8" cy="10" rx="2" ry="2" fill="white" filter={`url(#light1-${id || 'default'})`} />
                        <ellipse
                            cx="8"
                            cy="10"
                            rx="3"
                            ry="3"
                            fill="white"
                            filter={`url(#light1-${id || 'default'})`}
                            opacity={opacity}
                        />
                    </g>
                )}
            </g>
        </svg>
    );
};

export const LEDUI = ({ state, attrs }: { state: any; attrs: any }) => {
    const brightness = state?.brightness ?? 0;
    const color = attrs?.color || 'red';
    const illuminated = state?.illuminated ?? false;
    const id = state?.id || attrs?.id || 'led';

    return (
        <div style={{
            width: BOUNDS.w,
            height: BOUNDS.h,
            pointerEvents: 'none',
            overflow: 'visible',
            position: 'relative'
        }}>
            <LED_SVG color={color} brightness={brightness} illuminated={illuminated} id={id} />
        </div>
    );
};
