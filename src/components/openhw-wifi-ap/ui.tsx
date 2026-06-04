/**
 * openhw-wifi-ap/ui.tsx
 * Visual representation of the WiFi AP component.
 * Styled like Wokwi's wokwi-wifi-ap — dark panel with animated WiFi arcs.
 */

import { h } from 'preact';
import type { ComponentState } from '../BaseComponent';

interface Props {
  id: string;
  state: ComponentState & {
    ssid?: string;
    channel?: number;
    hasPassword?: boolean;
    internet?: boolean;
    connectedBoards?: number;
  };
  isRunning?: boolean;
}

export function WiFiApUI({ id, state, isRunning }: Props) {
  const ssid        = state.ssid        ?? 'OpenHW-GUEST';
  const hasPassword = state.hasPassword ?? false;
  const internet    = state.internet    ?? true;
  const channel     = state.channel     ?? 6;

  // Pulsing animation when running
  const pulseStyle = isRunning
    ? { animation: 'wifi-ap-pulse 2s ease-in-out infinite' }
    : {};

  return (
    <svg
      id={id}
      width="80"
      height="60"
      viewBox="0 0 80 60"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible', userSelect: 'none' }}
    >
      <style>{`
        @keyframes wifi-ap-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .wifi-arc { fill: none; stroke-linecap: round; }
      `}</style>

      {/* Background card */}
      <rect x="1" y="1" width="78" height="58" rx="8" ry="8"
        fill="#1a1f2e" stroke="#334155" strokeWidth="1.5" />

      {/* WiFi icon arcs */}
      <g transform="translate(40, 32)" style={pulseStyle}>
        {/* Outer arc */}
        <path
          className="wifi-arc"
          d="M -18 -10 A 22 22 0 0 1 18 -10"
          stroke={isRunning ? '#38bdf8' : '#475569'}
          strokeWidth="3"
          opacity="0.9"
        />
        {/* Middle arc */}
        <path
          className="wifi-arc"
          d="M -11 -3 A 14 14 0 0 1 11 -3"
          stroke={isRunning ? '#38bdf8' : '#475569'}
          strokeWidth="3"
          opacity="0.9"
        />
        {/* Inner arc */}
        <path
          className="wifi-arc"
          d="M -5 4 A 7 7 0 0 1 5 4"
          stroke={isRunning ? '#38bdf8' : '#475569'}
          strokeWidth="3"
          opacity="0.9"
        />
        {/* Center dot */}
        <circle cx="0" cy="10" r="3"
          fill={isRunning ? '#38bdf8' : '#475569'} />
      </g>

      {/* Lock icon (password protected) */}
      {hasPassword && (
        <g transform="translate(64, 8)">
          <rect x="-6" y="-4" width="12" height="9" rx="2"
            fill="#f97316" opacity="0.9" />
          <rect x="-3" y="5" width="6" height="5" rx="1"
            fill="#f97316" />
          <path d="M -3.5 -4 A 3.5 3.5 0 0 1 3.5 -4"
            fill="none" stroke="#f97316" strokeWidth="2.5" />
          <circle cx="0" cy="8" r="1.2" fill="#1a1f2e" />
        </g>
      )}

      {/* Internet globe icon */}
      {internet && (
        <g transform="translate(12, 8)">
          <circle cx="0" cy="0" r="5" fill="none" stroke="#4ade80" strokeWidth="1.5" opacity="0.8" />
          <path d="M -5 0 Q 0 -3 5 0 Q 0 3 -5 0" fill="none" stroke="#4ade80" strokeWidth="1" opacity="0.8" />
          <line x1="0" y1="-5" x2="0" y2="5" stroke="#4ade80" strokeWidth="1" opacity="0.8" />
        </g>
      )}

      {/* SSID label */}
      <text
        x="40" y="56"
        textAnchor="middle"
        fontSize="7"
        fontFamily="'Inter', 'SF Mono', monospace"
        fill="#94a3b8"
        letterSpacing="0"
      >
        {ssid.length > 12 ? ssid.slice(0, 11) + '…' : ssid}
      </text>

      {/* Channel badge */}
      <text
        x="40" y="13"
        textAnchor="middle"
        fontSize="6"
        fontFamily="monospace"
        fill="#64748b"
      >
        ch{channel}
      </text>
    </svg>
  );
}
