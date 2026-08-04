import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 80, h: 60 };

interface Props {
  id?: string;
  state: any;
  isRunning?: boolean;
}

export function WiFiApUI({ id, state, isRunning }: Props) {
  const ssid        = state?.ssid        ?? 'OpenHW-GUEST';
  const hasPassword = state?.hasPassword ?? false;
  const internet    = state?.internet    ?? true;
  const channel     = state?.channel     ?? 6;

  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, pointerEvents: 'none' }}>
      <svg
        id={id}
        width="100%"
        height="100%"
        viewBox="0 0 80 60"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible', userSelect: 'none', display: 'block' }}
      >
        <style>{`
          @keyframes wifi-wave {
            0% { opacity: 0; transform: scale(0.8); }
            30% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(1.3); }
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.2; }
          }
          .wave-1 { animation: wifi-wave 2s infinite; animation-delay: 0s; transform-origin: 0px 0px; }
          .wave-2 { animation: wifi-wave 2s infinite; animation-delay: 0.3s; transform-origin: 0px 0px; }
          .wave-3 { animation: wifi-wave 2s infinite; animation-delay: 0.6s; transform-origin: 0px 0px; }
          .blink-led { animation: blink 1s infinite; }
        `}</style>
        
        <defs>
          <linearGradient id="routerBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="antennaGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <filter id="glowGreen">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Antennas */}
        <g stroke="#111827" strokeWidth="0.5">
          <rect x="23" y="12" width="3" height="18" rx="1" fill="url(#antennaGradient)" transform="rotate(-15, 24.5, 30)" />
          <rect x="54" y="12" width="3" height="18" rx="1" fill="url(#antennaGradient)" transform="rotate(15, 55.5, 30)" />
          <circle cx="24.5" cy="30" r="2.5" fill="#1e293b" transform="rotate(-15, 24.5, 30)" />
          <circle cx="55.5" cy="30" r="2.5" fill="#1e293b" transform="rotate(15, 55.5, 30)" />
        </g>

        {/* Router Base */}
        <path d="M 15 35 Q 40 32 65 35 L 70 48 Q 40 53 10 48 Z" fill="url(#routerBody)" stroke="#334155" strokeWidth="0.5" />
        {/* Router Base highlight */}
        <path d="M 16 36 Q 40 33 64 36" fill="none" stroke="#64748b" strokeWidth="0.5" opacity="0.5" />
        
        {/* Status LEDs */}
        <g transform="translate(40, 46)">
          {/* PWR */}
          <circle cx="-8" cy="0" r="1.2" fill="#4ade80" filter="url(#glowGreen)" />
          {/* WAN */}
          <circle cx="0" cy="0" r="1.2" fill={internet ? "#4ade80" : "#ef4444"} filter={internet ? "url(#glowGreen)" : ""} className={isRunning && internet ? "blink-led" : ""} />
          {/* WLAN */}
          <circle cx="8" cy="0" r="1.2" fill="#38bdf8" className={isRunning ? "blink-led" : ""} />
        </g>

        {/* Animated WiFi Arcs coming from center above router */}
        <g transform="translate(40, 22)">
          <path d="M -2.5 0 A 2.5 2.5 0 0 1 2.5 0" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
          {isRunning && (
            <>
              <path className="wave-1" d="M -6 -3 A 7 7 0 0 1 6 -3" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
              <path className="wave-2" d="M -11 -7 A 13 13 0 0 1 11 -7" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
              <path className="wave-3" d="M -16 -11 A 19 19 0 0 1 16 -11" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
            </>
          )}
        </g>

        {/* Lock icon (password protected) */}
        {hasPassword && (
          <g transform="translate(68, 28)">
            <rect x="-3" y="-2" width="6" height="4.5" rx="1" fill="#f97316" />
            <path d="M -1.5 -2 v -1.5 a 1.5 1.5 0 0 1 3 0 v 1.5" fill="none" stroke="#f97316" strokeWidth="1" />
            <circle cx="0" cy="0.5" r="0.8" fill="#111" />
          </g>
        )}

        {/* SSID and Channel Label (Floating Hologram style) */}
        <text
          x="40" y="58"
          textAnchor="middle"
          fontSize="5"
          fontFamily="monospace"
          fill="#94a3b8"
          fontWeight="bold"
        >
          {ssid.length > 15 ? ssid.slice(0, 14) + '…' : ssid} (CH{channel})
        </text>
      </svg>
    </div>
  );
}

