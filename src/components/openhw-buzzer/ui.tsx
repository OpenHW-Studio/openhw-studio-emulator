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

    // Initialize persistent oscillator and gain nodes once on mount
    useEffect(() => {
        let activeOsc: OscillatorNode | null = null;
        let activeGain: GainNode | null = null;

        try {
            if (!audioCtx) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                    audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
                }
            }

            if (audioCtx) {
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume().catch(() => {});
                }

                // Create persistent low-latency oscillator and gain nodes
                activeOsc = audioCtx.createOscillator();
                activeGain = audioCtx.createGain();

                activeOsc.type = 'square';
                activeOsc.frequency.setValueAtTime(activeFreq, audioCtx.currentTime);

                // Set initial gain/volume to 0 (silent)
                activeGain.gain.setValueAtTime(0, audioCtx.currentTime);

                activeOsc.connect(activeGain);
                activeGain.connect(audioCtx.destination);
                activeOsc.start();

                oscRef.current = activeOsc;
                gainRef.current = activeGain;
            }
        } catch (err) {
            console.warn('Low-latency Web Audio API initialization failed:', err);
        }

        return () => {
            if (activeOsc) {
                try {
                    activeOsc.stop();
                    activeOsc.disconnect();
                } catch (e) {}
            }
            if (activeGain) {
                try {
                    activeGain.disconnect();
                } catch (e) {}
            }
            oscRef.current = null;
            gainRef.current = null;
        };
    }, []); // Run once on mount

    // Modulate gain (volume) and frequency dynamically on changes
    useEffect(() => {
        if (!oscRef.current || !gainRef.current || !audioCtx) return;

        try {
            if (audioCtx.state === 'suspended' && isBuzzing) {
                audioCtx.resume().catch(() => {});
            }

            // Update frequency
            if (activeFreq > 0) {
                oscRef.current.frequency.setValueAtTime(activeFreq, audioCtx.currentTime);
            }

            // Instantly transition gain between active volume and silent (0)
            const targetVol = isBuzzing && volumeAttr > 0
                ? (Math.max(0, Math.min(100, volumeAttr)) / 100) * 0.3
                : 0;

            gainRef.current.gain.setValueAtTime(targetVol, audioCtx.currentTime);
        } catch (err) {
            console.warn('Error modulating Web Audio parameters:', err);
        }
    }, [isBuzzing, activeFreq, volumeAttr]);

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
