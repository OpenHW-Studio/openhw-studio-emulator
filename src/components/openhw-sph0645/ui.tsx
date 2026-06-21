import React, { useEffect, useRef } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 90, h: 60 };

export const UI = ({ state, attrs }: { state: any, attrs: any }) => {
  const peakAmplitude = (state?.peakAmplitude as number) || 0;
  const liveMicEnabled = attrs?.micMode === 'real';
  
  const ledBrightness = Math.min(1, peakAmplitude * 2);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  useEffect(() => {
    if (!liveMicEnabled) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      return;
    }

    let isMounted = true;
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(async stream => {
        if (!isMounted) return;
        streamRef.current = stream;
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        
        const source = audioCtx.createMediaStreamSource(stream);
        
        // Define worklet processor inline
        const workletCode = `
          class MicProcessor extends AudioWorkletProcessor {
            process(inputs, outputs, parameters) {
              const input = inputs[0];
              if (input && input.length > 0 && input[0].length > 0) {
                // Send array of floats
                this.port.postMessage(Array.from(input[0]));
              }
              return true; // Keep alive
            }
          }
          registerProcessor('mic-processor', MicProcessor);
        `;
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        
        await audioCtx.audioWorklet.addModule(url);
        if (!isMounted) return;

        const workletNode = new AudioWorkletNode(audioCtx, 'mic-processor');
        workletNode.port.onmessage = (e) => {
          if (attrs.onInteract) {
              attrs.onInteract({ type: 'mic_data', data: e.data });
          }
        };
        
        source.connect(workletNode);
        workletNode.connect(audioCtx.destination);
        workletNodeRef.current = workletNode;
      })
      .catch(err => {
        console.warn('Microphone access denied or error:', err);
        if (attrs.onInteract) {
            attrs.onInteract({ type: 'mic_error' });
        }
      });

    return () => {
      isMounted = false;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (workletNodeRef.current) workletNodeRef.current.disconnect();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.warn('AudioContext close error:', e));
      }
    };
  }, [liveMicEnabled, attrs]);

  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, pointerEvents: 'none' }}>
      <svg width={BOUNDS.w} height={BOUNDS.h} viewBox={`0 0 ${BOUNDS.w} ${BOUNDS.h}`} style={{ display: 'block', overflow: 'visible' }}>
        {/* Round mic breakout board */}
        <circle cx="45" cy="25" r="25" fill="#111155" stroke="#000033" strokeWidth="2" />
        
        {/* Microphone Hole */}
        <circle cx="45" cy="25" r="8" fill="#000" />
        <circle cx="45" cy="25" r="6" fill="#222" />
        
        {/* Activity LED */}
        <circle cx="30" cy="12" r="3" fill={`rgba(0, 255, 0, ${ledBrightness})`} stroke="#004400" />
        
        {/* Pins - Bottom edge */}
        <g>
          {[7.5, 22.5, 37.5, 52.5, 67.5, 82.5].map((x) => (
            <React.Fragment key={x}>
              <rect x={x - 2} y="52.5" width="4" height="7.5" fill="#E6C200" />
              <circle cx={x} cy="52.5" r="1.5" fill="#2C3E50" />
            </React.Fragment>
          ))}
          
          <text x="7.5" y="48" fill="#fff" fontSize="4" textAnchor="middle">3V</text>
          <text x="22.5" y="48" fill="#fff" fontSize="4" textAnchor="middle">GND</text>
          <text x="37.5" y="48" fill="#fff" fontSize="4" textAnchor="middle">BCLK</text>
          <text x="52.5" y="48" fill="#fff" fontSize="4" textAnchor="middle">DOUT</text>
          <text x="67.5" y="48" fill="#fff" fontSize="4" textAnchor="middle">LRCL</text>
          <text x="82.5" y="48" fill="#fff" fontSize="4" textAnchor="middle">SEL</text>
        </g>

        {!liveMicEnabled && (
          <text x="45" y="45" fill="#f55" fontSize="4" textAnchor="middle">Mocked Audio</text>
        )}
      </svg>
    </div>
  );
};
