import React, { useEffect, useRef } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 60, h: 60 };

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
        <circle cx="30" cy="30" r="28" fill="#111155" stroke="#000033" strokeWidth="2" />
        
        {/* Microphone Hole */}
        <circle cx="30" cy="30" r="8" fill="#000" />
        <circle cx="30" cy="30" r="6" fill="#222" />
        
        {/* Activity LED */}
        <circle cx="15" cy="15" r="3" fill={`rgba(0, 255, 0, ${ledBrightness})`} stroke="#004400" />
        
        {/* Pins - Bottom edge */}
        <g transform="translate(0, 50)">
          <rect x="5" y="0" width="8" height="6" fill="#E6C200" />
          <rect x="15" y="0" width="8" height="6" fill="#E6C200" />
          <rect x="25" y="0" width="8" height="6" fill="#E6C200" />
          <rect x="35" y="0" width="8" height="6" fill="#E6C200" />
          <rect x="45" y="0" width="8" height="6" fill="#E6C200" />
          
          <text x="9" y="-2" fill="#fff" fontSize="4" textAnchor="middle">VDD</text>
          <text x="19" y="-2" fill="#fff" fontSize="4" textAnchor="middle">GND</text>
          <text x="29" y="-2" fill="#fff" fontSize="4" textAnchor="middle">L/R</text>
          <text x="39" y="-2" fill="#fff" fontSize="4" textAnchor="middle">WS</text>
          <text x="49" y="-2" fill="#fff" fontSize="4" textAnchor="middle">SCK</text>
        </g>
        
        {/* SD Pin - Top Edge */}
        <rect x="26" y="2" width="8" height="6" fill="#E6C200" />
        <text x="30" y="14" fill="#fff" fontSize="4" textAnchor="middle">SD</text>

        {!liveMicEnabled && (
          <text x="30" y="45" fill="#f55" fontSize="4" textAnchor="middle">Mocked Audio</text>
        )}
      </svg>
    </div>
  );
};
