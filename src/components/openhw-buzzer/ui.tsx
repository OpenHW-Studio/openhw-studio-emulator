import React, { useEffect, useRef } from 'react';

// Bounding box for the blue selection ring.
export const BOUNDS = { x: 0, y: 0, w: 36, h: 47.6 };

// Global audio context shared across buzzer instances
let audioCtx: AudioContext | null = null;

export const BuzzerUI = ({ state, attrs }: { state: any, attrs: any }) => {
    const nativeW = 64;
    const nativeH = 90;
    const scaleX = BOUNDS.w / nativeW;
    const scaleY = BOUNDS.h / nativeH;

    const oscRef = useRef<OscillatorNode | null>(null);
    const gainRef = useRef<GainNode | null>(null);

    const isBuzzing = state?.isBuzzing;
    const dynamicFreq = state?.frequency;
    const volumeAttr = attrs?.volume !== undefined ? Number(attrs.volume) : 50; // Default 50%
    const freqAttr = attrs?.frequency !== undefined ? Number(attrs.frequency) : 440; // Default 440Hz

    // The actual frequency to play: dynamic frequency from logic (if valid) else fallback to attr.
    const activeFreq = dynamicFreq > 0 ? dynamicFreq : freqAttr;

    // Start/stop oscillator
    useEffect(() => {
        if (!isBuzzing || volumeAttr <= 0) {
            if (oscRef.current) {
                try {
                    oscRef.current.stop();
                    oscRef.current.disconnect();
                } catch (e) {}
                oscRef.current = null;
            }
            return;
        }

        try {
            if (!audioCtx) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                    audioCtx = new AudioContextClass();
                }
            }

            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            if (audioCtx && !oscRef.current) {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.type = 'square'; // Buzzers produce square waves
                osc.frequency.setValueAtTime(activeFreq, audioCtx.currentTime);

                // Convert volume percentage (0-100) to pleasant gain level (max 0.3)
                const vol = Math.max(0, Math.min(100, volumeAttr)) / 100;
                gain.gain.setValueAtTime(vol * 0.3, audioCtx.currentTime);

                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();

                oscRef.current = osc;
                gainRef.current = gain;
            }
        } catch (err) {
            console.warn('Web Audio API not allowed or supported:', err);
        }

        return () => {
            if (oscRef.current) {
                try {
                    oscRef.current.stop();
                    oscRef.current.disconnect();
                } catch (e) {}
                oscRef.current = null;
            }
        };
    }, [isBuzzing, volumeAttr > 0]);

    // Update frequency and volume on the fly
    useEffect(() => {
        if (oscRef.current && gainRef.current && audioCtx) {
            oscRef.current.frequency.setValueAtTime(activeFreq, audioCtx.currentTime);
            const vol = Math.max(0, Math.min(100, volumeAttr)) / 100;
            gainRef.current.gain.setValueAtTime(vol * 0.3, audioCtx.currentTime);
        }
    }, [activeFreq, volumeAttr]);

    return (
        <div style={{ 
            pointerEvents: 'none', 
            width: BOUNDS.w, 
            height: BOUNDS.h,
            position: 'relative',
            overflow: 'visible'
        }}>
            {React.createElement('wokwi-buzzer', {
                hasSignal: state?.isBuzzing ? true : undefined,
                ...attrs,
                style: {
                    display: 'block',
                    width: nativeW,
                    height: nativeH,
                    transform: `scale(${scaleX}, ${scaleY})`,
                    transformOrigin: '0 0'
                }
            })}
            {state?.isBuzzing && (
                <div style={{ 
                    position: 'absolute', 
                    top: -10 * scaleY, 
                    left: 10 * scaleX, 
                    color: 'orange', 
                    fontSize: 16 * scaleX 
                }}>♪</div>
            )}
        </div>
    );
};
