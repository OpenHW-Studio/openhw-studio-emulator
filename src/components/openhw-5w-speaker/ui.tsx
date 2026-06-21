import React, { useEffect, useRef, useState } from 'react';

export const BOUNDS = { x: 0, y: 0, w: 75, h: 90 };

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
      <svg width={BOUNDS.w} height={BOUNDS.h} viewBox="0 0 75 90" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
        <g transform={`translate(37.5, 37.5) scale(${scale})`} style={{ transformOrigin: '0 0', transition: 'transform 0.05s linear' }}>
          {/* Speaker Frame */}
          <circle cx="0" cy="0" r="35" fill="#333" stroke="#555" strokeWidth="2" />
          {/* Inner Cone */}
          <circle cx="0" cy="0" r="28" fill="#222" />
          <circle cx="0" cy="0" r="22" fill="#1a1a1a" />
          {/* Dust Cap */}
          <circle cx="0" cy="0" r="9" fill="#111" />
        </g>
        
        {/* Terminal legs from body to pins */}
        <line x1="27" y1="72" x2="30" y2="90" stroke="#cc0000" strokeWidth="1.5" />
        <line x1="48" y1="72" x2="45" y2="90" stroke="#0000cc" strokeWidth="1.5" />
        
        {/* Terminal pads at pin positions */}
        <circle cx="30" cy="90" r="3" fill="#cc0000" stroke="#900" strokeWidth="0.5" />
        <circle cx="45" cy="90" r="3" fill="#0000cc" stroke="#009" strokeWidth="0.5" />
        
        <text x="30" y="85" fill="#fff" fontSize="6" textAnchor="middle">+</text>
        <text x="45" y="85" fill="#fff" fontSize="6" textAnchor="middle">−</text>
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
