import React, { useState } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 120, h: 130 };

const PROTOCOL_LABELS: Record<string, string> = {
  NEC: 'NEC', NEC_EXT: 'NEC Ext', SONY_12: 'Sony 12', SONY_15: 'Sony 15',
  SONY_20: 'Sony 20', RC5: 'RC-5', RC6: 'RC-6', SAMSUNG: 'Samsung',
  JVC: 'JVC', PANASONIC: 'Panasonic',
};

export const IRTransmitterContextMenu = ({ attrs, onUpdate }: { attrs: any; onUpdate: (key: string, value: any) => void }) => (
  <>
    <span style={{ fontSize: 12, color: 'var(--text2)' }}>Protocol:</span>
    <select
      value={attrs?.protocol ?? 'NEC'}
      onChange={e => onUpdate('protocol', e.target.value)}
      style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, outline: 'none' }}
    >
      {Object.entries(PROTOCOL_LABELS).map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
    <span style={{ fontSize: 12, color: 'var(--text2)' }}>Range (px):</span>
    <input
      type="number" min={50} max={1000} step={10}
      value={attrs?.range ?? 300}
      onChange={e => onUpdate('range', parseInt(e.target.value, 10))}
      style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, width: 60, outline: 'none' }}
    />
    <span style={{ fontSize: 12, color: 'var(--text2)' }}>Cone Angle:</span>
    <input
      type="number" min={5} max={360} step={5}
      value={attrs?.coneAngle ?? 30}
      onChange={e => onUpdate('coneAngle', parseInt(e.target.value, 10))}
      style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, width: 60, outline: 'none' }}
    />
  </>
);

const ReceiverDot = ({ x, y, inCone }: { x: number; y: number; inCone: boolean }) => (
  <circle cx={x} cy={y} r={4} fill={inCone ? '#22c55e' : '#6b7280'} stroke="#fff" strokeWidth={1} />
);

export const IRTransmitterUI = ({ state, attrs, onEvent }: { state: any; attrs: any; onEvent?: (event: any) => void }) => {
  const active = state?.active ?? false;
  const protocol: string = state?.protocol ?? attrs?.protocol ?? 'NEC';
  const addressHex: string = state?.addressHex ?? '0000';
  const commandHex: string = state?.commandHex ?? '0040';
  const receiversInRange: number = state?.receiversInRange ?? 0;
  const lastSignal: string = state?.lastSignal ?? '';
  const [showControl, setShowControl] = useState(false);
  const [addrInput, setAddrInput] = useState('0');
  const [cmdInput, setCmdInput] = useState('64');
  const [protoSelect, setProtoSelect] = useState(protocol);

  const handleSend = () => {
    const addr = parseInt(addrInput, 16) || 0;
    const cmd = parseInt(cmdInput, 16) || 0;
    onEvent?.({ type: 'ir-send', address: addr, command: cmd });
  };

  const handleProtoChange = (p: string) => {
    setProtoSelect(p);
    onEvent?.({ type: 'set-protocol', value: p });
  };

  // Radar sweep angle
  const coneAngle = parseInt(attrs?.coneAngle ?? '30', 10);
  const halfAngle = coneAngle / 2;

  return (
    <div style={{ position: 'relative', width: 120, height: 130 }}>
      <svg
        viewBox="0 0 240 260"
        width="100%"
        height="100%"
        style={{ cursor: 'pointer', display: 'block', overflow: 'visible' }}
        onClick={() => setShowControl(s => !s)}
      >
        {/* Radar cone — extends beyond component bounds */}
        {active && (
          <g opacity={0.25}>
            <path
              d={`M 120 220 L ${120 - Math.sin(halfAngle * Math.PI / 180) * 300} ${220 - Math.cos(halfAngle * Math.PI / 180) * 300}
                  A 300 300 0 0 1 ${120 + Math.sin(halfAngle * Math.PI / 180) * 300} ${220 - Math.cos(halfAngle * Math.PI / 180) * 300} Z`}
              fill="#ef4444"
              opacity={active ? 0.3 : 0.1}
            />
            <path
              d={`M 120 220 L ${120 - Math.sin(halfAngle * Math.PI / 180) * 250} ${220 - Math.cos(halfAngle * Math.PI / 180) * 250}
                  A 250 250 0 0 1 ${120 + Math.sin(halfAngle * Math.PI / 180) * 250} ${220 - Math.cos(halfAngle * Math.PI / 180) * 250} Z`}
              fill="none" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4"
            />
          </g>
        )}

        {/* Receiver dots at relative positions */}
        {state?.nearbyReceivers?.map((r: any, i: number) => (
          <ReceiverDot
            key={r.id ?? i}
            x={120 + (r.x ?? 0) - ((state as any).txPosX ?? 0)}
            y={220 + (r.y ?? 0) - ((state as any).txPosY ?? 0)}
            inCone={r.inCone ?? false}
          />
        ))}

        {/* PCB Base */}
        <rect x="60" y="40" width="120" height="180" fill="#111318" rx="8" />
        <rect x="65" y="45" width="110" height="170" fill="none" stroke="#f3f4f6" strokeWidth="2" rx="4" />

        {/* IR LED dome */}
        <circle cx="120" cy="90" r="28" fill={active ? '#ef4444' : '#1f2937'} />
        <circle cx="120" cy="90" r="20" fill={active ? '#fca5a5' : '#111827'} />
        <ellipse cx="120" cy="78" rx="14" ry="6" fill={active ? '#fef2f2' : '#374151'} opacity={0.4} />

        {/* Protocol label */}
        <text x="120" y="140" fill="#9ca3af" fontSize="16" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          {PROTOCOL_LABELS[protocol] ?? protocol}
        </text>

        {/* Hex code display */}
        <text x="120" y="160" fill="#f3f4f6" fontSize="12" fontFamily="monospace" textAnchor="middle">
          A:{addressHex}
        </text>
        <text x="120" y="175" fill="#f3f4f6" fontSize="12" fontFamily="monospace" textAnchor="middle">
          C:{commandHex}
        </text>

        {/* Bottom pins */}
        <rect x="96" y="220" width="8" height="40" fill="#9ca3af" rx="2" />
        <rect x="96" y="220" width="3" height="40" fill="#f3f4f6" rx="1" />
        <rect x="66" y="220" width="8" height="40" fill="#9ca3af" rx="2" />
        <rect x="66" y="220" width="3" height="40" fill="#f3f4f6" rx="1" />
        <rect x="126" y="220" width="8" height="40" fill="#9ca3af" rx="2" />
        <rect x="126" y="220" width="3" height="40" fill="#f3f4f6" rx="1" />

        {/* Pin labels */}
        <text x="70" y="215" fill="#f3f4f6" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">G</text>
        <text x="100" y="215" fill="#f3f4f6" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">V</text>
        <text x="130" y="215" fill="#f3f4f6" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">S</text>

        {/* Receiver count badge */}
        <rect x="160" y="45" width="28" height="16" rx="8" fill={receiversInRange > 0 ? '#22c55e' : '#4b5563'} />
        <text x="174" y="56" fill="#fff" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          {receiversInRange}
        </text>

        {/* Transmission indicator */}
        {active && (
          <>
            <circle cx="70" cy="50" r="4" fill="#ef4444">
              <animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite" />
            </circle>
          </>
        )}
      </svg>

      {/* Control popup */}
      {showControl && (
        <div style={{
          position: 'absolute', top: 90, left: -10,
          zIndex: 1000,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 8, padding: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          minWidth: 140,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 'bold' }}>IR Transmitter</span>
            <button
              onClick={() => setShowControl(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}
            >✕</button>
          </div>

          <div style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 9, color: 'var(--text2)', display: 'block' }}>Protocol</label>
            <select
              value={protoSelect}
              onChange={e => handleProtoChange(e.target.value)}
              style={{ width: '100%', fontSize: 10, background: '#1f2937', color: '#fff', border: '1px solid #374151', borderRadius: 4, padding: 2 }}
            >
              {Object.entries(PROTOCOL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 9, color: 'var(--text2)', display: 'block' }}>Address (hex)</label>
              <input
                value={addrInput}
                onChange={e => setAddrInput(e.target.value)}
                style={{ width: '100%', fontSize: 10, background: '#1f2937', color: '#fff', border: '1px solid #374151', borderRadius: 4, padding: 2 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 9, color: 'var(--text2)', display: 'block' }}>Command (hex)</label>
              <input
                value={cmdInput}
                onChange={e => setCmdInput(e.target.value)}
                style={{ width: '100%', fontSize: 10, background: '#1f2937', color: '#fff', border: '1px solid #374151', borderRadius: 4, padding: 2 }}
              />
            </div>
          </div>

          <button
            onMouseDown={handleSend}
            style={{
              width: '100%', padding: '4px 0',
              background: active ? '#22c55e' : '#ef4444',
              color: '#fff', border: 'none', borderRadius: 4,
              fontSize: 10, fontWeight: 'bold', cursor: 'pointer',
            }}
          >
            {active ? 'SENDING...' : 'SEND IR'}
          </button>

          {lastSignal && (
            <div style={{ fontSize: 8, color: 'var(--text2)', textAlign: 'center', marginTop: 4, wordBreak: 'break-all' }}>
              {lastSignal}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
