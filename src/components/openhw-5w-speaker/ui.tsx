import React, { useEffect, useRef, useState } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 80, h: 80 };

export const UI = ({ state, attrs }: { state: any, attrs: any }) => {
  const audioChunk = state?.audioChunk;
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  
  // Vibration visualization
  const [scale, setScale] = useState(1);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      nextStartTimeRef.current = audioContextRef.current.currentTime;
    }

    if (audioChunk && audioChunk.length > 0) {
      const ctx = audioContextRef.current;
      const buffer = ctx.createBuffer(1, audioChunk.length, 44100);
      const channelData = buffer.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < audioChunk.length; i++) {
        channelData[i] = audioChunk[i];
        if (Math.abs(audioChunk[i]) > peak) peak = Math.abs(audioChunk[i]);
      }
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      // Schedule playback to avoid gaps
      const now = ctx.currentTime;
      if (nextStartTimeRef.current < now) {
          nextStartTimeRef.current = now;
      }
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;
      
      setIsPlaying(true);
      setScale(1 + peak * 0.1);
      
      if (animationRef.current) clearTimeout(animationRef.current);
      animationRef.current = window.setTimeout(() => {
          setScale(1);
          setIsPlaying(false);
      }, buffer.duration * 1000 + 50);
    }
  }, [audioChunk]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.warn('AudioContext close error:', e));
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h }}>
      <svg width={BOUNDS.w} height={BOUNDS.h}>
        <g transform={`scale(${scale})`} style={{ transformOrigin: 'center center', transition: 'transform 0.05s linear' }}>
          {/* Speaker Frame */}
          <circle cx="40" cy="40" r="38" fill="#333" stroke="#555" strokeWidth="2" />
          {/* Inner Cone */}
          <circle cx="40" cy="40" r="30" fill="#222" />
          <circle cx="40" cy="40" r="25" fill="#1a1a1a" />
          {/* Dust Cap */}
          <circle cx="40" cy="40" r="10" fill="#111" />
          
          {/* Terminals */}
          <rect x="15" y="70" width="10" height="10" fill="#cc0000" />
          <rect x="55" y="70" width="10" height="10" fill="#0000cc" />
          
          <text x="20" y="78" fill="#fff" fontSize="6" textAnchor="middle">+</text>
          <text x="60" y="78" fill="#fff" fontSize="6" textAnchor="middle">-</text>

          {/* Invisible pin hitboxes for the UI wiring */}
          <circle cx="20" cy="75" r="5" fill="transparent" />
          <circle cx="60" cy="75" r="5" fill="transparent" />
        </g>
      </svg>
      {isPlaying && (
        <div style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          color: '#0f0', fontSize: '10px', whiteSpace: 'nowrap', pointerEvents: 'none'
        }}>
          ♪ Playing...
        </div>
      )}
    </div>
  );
};
