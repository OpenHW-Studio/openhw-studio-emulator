import React from 'react'

// Clean-grid layout UI for HP4067
export const BOUNDS = { x: 0, y: 0, w: 100, h: 280 }

export const HP4067UI = ({ state }: { state: any }) => {
  const active = typeof state?.activeChannel === 'number' ? state.activeChannel : -1

  // Grid constants per "Clean Slate" prompt
  const leftX = 15
  const rightX = 85
  const startY = 20
  const step = 14
  const totalC = 16

  // y for a given C index where C15 is at the top (startY)
  const yOfC = (index: number) => startY + (totalC - 1 - index) * step

  // Left pins C0..C15 (C0 bottom, C15 top)
  const leftPins = Array.from({ length: totalC }, (_, i) => ({
    label: `C${i}`,
    x: leftX,
    y: yOfC(i),
    channel: i,
  }))

  // Right/control pins mapped to specific C rows
  const rightPins = [
    { label: 'GND', y: yOfC(15), x: rightX },
    { label: 'VCC', y: yOfC(14), x: rightX },
    { label: 'EN',  y: yOfC(13), x: rightX },

    { label: 'S3', y: yOfC(10), x: rightX },
    { label: 'S2', y: yOfC(9),  x: rightX },
    { label: 'S1', y: yOfC(8),  x: rightX },
    { label: 'S0', y: yOfC(7),  x: rightX },

    { label: 'SIG', y: yOfC(0), x: rightX },
  ]

  const containerStyle: React.CSSProperties = {
    width: BOUNDS.w,
    height: BOUNDS.h,
    background: 'linear-gradient(180deg,#1A4789 0%, #0b5f91 100%)',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: `0 8px 18px rgba(0,0,0,0.45)`,
    position: 'relative',
    overflow: 'hidden',
    fontFamily: 'monospace',
  }

  const pad = (size = 10) => ({
    width: size,
    height: size,
    borderRadius: '999px',
    background: 'radial-gradient(circle at 30% 30%, #e6e6e6, #9ca3af)',
    border: '1px solid #6b7280',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
  } as React.CSSProperties)

  // Narrow IC per request: width 20px centered at x=50
  const chipWidth = 20
  const chipHeight = 100
  const chipLeft = 50 - chipWidth / 2
  const chipTop = (BOUNDS.h - chipHeight) / 2
  // Absolute label gutter positions
  const labelXLeft = 28
  const labelXRight = 72

  return (
    <div style={containerStyle}>
      {/* chip behind pins */}
      <div style={{ position: 'absolute', left: chipLeft, top: chipTop, width: chipWidth, height: chipHeight, background: 'linear-gradient(180deg,#111,#050505)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 12px rgba(0,0,0,0.6)', zIndex: 0 }}>
        <div style={{ color: '#fbbf24', fontSize: 9, fontWeight: 700, textAlign: 'center' }}>
          <div>HP4067</div>
        </div>
      </div>

      {/* subtle texture */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle at 12px 12px, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none', zIndex: 1 }} />

      {/* Left column pads (labels rendered separately at fixed gutter) */}
      {leftPins.map((p) => {
        const isActive = active === p.channel
        return (
          <div key={p.label} style={{ position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%,-50%)', zIndex: 2 }}>
            <div style={pad(10)} />
            {isActive && <div style={{ position: 'absolute', left: 20, top: '50%', width: 8, height: 8, borderRadius: 999, background: '#22c55e', transform: 'translate(-50%,-50%)', boxShadow: '0 0 10px rgba(34,197,94,0.9)', zIndex: 3 }} />}
          </div>
        )
      })}

      {/* Left labels at absolute gutter x */}
      {leftPins.map((p) => (
        <div key={p.label + '-lbl'} style={{ position: 'absolute', left: labelXLeft, top: p.y, transform: 'translateY(-50%)', color: '#fff', fontSize: 8, fontWeight: 700, textShadow: '0 1px 1px rgba(0,0,0,0.4)', textAlign: 'left', zIndex: 4 }}>
          {p.label}
        </div>
      ))}

      {/* Right/control pins (labels rendered separately at fixed gutter) */}
      {rightPins.map((p) => (
        <div key={p.label} style={{ position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%,-50%)', zIndex: 2 }}>
          <div style={pad(10)} />
        </div>
      ))}

      {/* Right labels at absolute gutter x */}
      {rightPins.map((p) => (
        <div key={p.label + '-lbl'} style={{ position: 'absolute', left: labelXRight, top: p.y, transform: 'translateY(-50%)', color: '#fff', fontSize: 8, fontWeight: 700, textShadow: '0 1px 1px rgba(0,0,0,0.4)', textAlign: 'right', zIndex: 4 }}>
          {p.label}
        </div>
      ))}

        {/* footer moved to 20px below C0 to avoid overlap */}
        <div style={{ position: 'absolute', left: 8, top: (yOfC(0) + 20), color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)', zIndex: 4 }}>
          <div style={{ fontSize: 9, fontWeight: 700 }}>16-Channel Analog Multiplexer</div>
        </div>
    </div>
  )
}

export default HP4067UI
