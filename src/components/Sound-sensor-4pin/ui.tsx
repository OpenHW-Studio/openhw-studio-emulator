import React, { useState, useRef, useCallback, useEffect } from 'react';
import soundSensorImage from './SoundSensor.png';

const BOUNDS = { w: 100, h: 190 };

// ── Context Menu ──────────────────────────────────────────────────────────────
export const SoundSensorContextMenu = ({
    attrs,
    onUpdate,
}: {
    attrs: any;
    onUpdate: (key: string, value: any) => void;
}) => {
    const threshold = attrs?.threshold ?? 500;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Threshold (0–1023):</span>
            <input
                type="range" min="0" max="1023" value={threshold}
                onChange={e => onUpdate('threshold', parseInt(e.target.value))}
                style={{ width: 100 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text)', minWidth: 28 }}>{threshold}</span>
        </div>
    );
};

// ── Visualiser bars ───────────────────────────────────────────────────────────
const NUM_BARS = 7;
const SoundWave = ({ level, detected }: { level: number; detected: boolean }) => {
    const norm = level / 1023;
    const color = detected ? '#ef4444' : '#22c55e';
    return (
        <svg width="44" height="28" viewBox="0 0 44 28" style={{ display: 'block' }}>
            {Array.from({ length: NUM_BARS }).map((_, i) => {
                const frac = Math.abs(Math.sin((i / (NUM_BARS - 1)) * Math.PI)) * norm;
                const h = Math.max(2, frac * 24);
                const y = (28 - h) / 2;
                return <rect key={i} x={2 + i * 6} y={y} width={4} height={h} rx={2} fill={color} opacity={0.85} />;
            })}
        </svg>
    );
};

// ── Main UI ───────────────────────────────────────────────────────────────────
export const SoundSensorUI = ({
    state,
    attrs,
    isRunning,
}: {
    state: any;
    attrs: any;
    isRunning: boolean;
}) => {
    // ── ALL display state is LOCAL — never read soundDetected from logic state ──
    const [micActive, setMicActive] = useState(false);
    const [micError, setMicError] = useState<string | null>(null);
    const [localDetected, setLocalDetected] = useState(false);
    const [localLevel, setLocalLevel] = useState(0);

    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);

    // Force initial state sync to emulator engine so DO doesn't float HIGH
    useEffect(() => {
        if (isRunning) {
            // Give the emulator 100ms to boot up and connect wires, then push 0.0V
            const timer = setTimeout(() => {
                if (attrs?.onInteract) {
                    attrs.onInteract({ type: 'sound_state', soundDetected: false, soundLevel: 0 });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isRunning, attrs]);

    // Read threshold locally (context menu writes it via attrs)
    const thresholdRef = useRef<number>(512);
    const threshold = attrs?.threshold ?? 512;
    thresholdRef.current = threshold;

    // ── Emit to logic (drives DO/AO pins) ────────────────────────────────────
    const emit = useCallback((detected: boolean, level: number) => {
        if (attrs?.onInteract) {
            attrs.onInteract({ type: 'sound_state', soundDetected: detected, soundLevel: level });
        }
    }, [attrs]);

    // ── Audio polling — TIME DOMAIN (accurate, truly zero when silent) ────────
    const startPolling = useCallback((analyser: AnalyserNode) => {
        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);

        const poll = () => {
            // TIME DOMAIN: each byte is 0-255 with 128=silence
            analyser.getByteTimeDomainData(dataArray);

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                const s = (dataArray[i] - 128) / 128; // -1..1, 0 when silent
                sum += s * s;
            }
            const rms = Math.sqrt(sum / bufferLength); // 0..1, truly 0 when silent

            // Amplify (typical speech rms ~0.02-0.1) then map to 0-1023
            const level = Math.min(1023, Math.round(Math.min(1, rms * 20) * 1023));
            const detected = level > thresholdRef.current;

            setLocalLevel(level);
            setLocalDetected(detected);
            emit(detected, level);

            rafRef.current = requestAnimationFrame(poll);
        };
        rafRef.current = requestAnimationFrame(poll);
    }, [emit]);

    // ── Start mic ─────────────────────────────────────────────────────────────
    const startMic = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            streamRef.current = stream;

            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            await ctx.resume(); // ensure not suspended
            audioCtxRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 1024; // larger = more accurate time-domain
            source.connect(analyser);
            analyserRef.current = analyser;

            startPolling(analyser);
            setMicActive(true);
            setMicError(null);
        } catch {
            setMicError('Mic access denied');
        }
    }, [startPolling]);

    // ── Stop mic ──────────────────────────────────────────────────────────────
    const stopMic = useCallback(() => {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        analyserRef.current = null;

        setMicActive(false);
        setLocalDetected(false);
        setLocalLevel(0);
        emit(false, 0); // tell logic: silence
    }, [emit]);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    useEffect(() => () => { stopMic(); }, []);
    useEffect(() => { if (!isRunning && micActive) stopMic(); }, [isRunning]);

    // ── Toggle on click ───────────────────────────────────────────────────────
    const handleClick = (e: React.MouseEvent) => {
        if (!isRunning) return;
        e.stopPropagation();
        micActive ? stopMic() : startMic();
    };

    // ── What to display — ALWAYS local, never from state prop ─────────────────
    const displayDetected = micActive && localDetected;   // false when mic off
    const displayLevel = micActive ? localLevel : 0;   // 0 when mic off

    const glowStyle: React.CSSProperties = displayDetected
        ? { boxShadow: '0 0 16px 5px rgba(239,68,68,0.6)', transition: 'box-shadow 0.08s' }
        : { boxShadow: '0 0 0 0 rgba(0,0,0,0)', transition: 'box-shadow 0.3s' };

    return (
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
            <div
                onMouseDown={(e: React.MouseEvent) => { if (isRunning) e.stopPropagation(); }}
                title={!isRunning ? 'Start simulation to enable' : undefined}
                style={{
                    position: 'relative',
                    width: BOUNDS.w, height: BOUNDS.h,
                    minWidth: BOUNDS.w, minHeight: BOUNDS.h,
                    pointerEvents: isRunning ? 'auto' : 'none',
                    borderRadius: 6, overflow: 'visible',
                    ...glowStyle,
                }}
            >
                {/* ── Sensor image as SVG ──────────────────────────────────── */}
                <svg viewBox={`0 0 ${BOUNDS.w} ${BOUNDS.h}`} width={BOUNDS.w} height={BOUNDS.h}
                    style={{ display: 'block', borderRadius: 6, overflow: 'hidden' }}>
                    <image href={soundSensorImage} x={-53} y={0}
                        width={200} height={190} preserveAspectRatio="xMidYMid meet" />

                    {/* PWR LED overlay */}
                    {isRunning && (
                        <>
                            <circle cx={BOUNDS.w * 0.75} cy={BOUNDS.h * 0.40} r={5}
                                fill="rgba(34,197,94,0.7)" style={{ filter: 'blur(2px)' }} />
                            <circle cx={BOUNDS.w * 0.75} cy={BOUNDS.h * 0.40} r={3} fill="#22c55e" opacity={0.95} />
                        </>
                    )}
                    {/* OUT LED overlay */}
                    {displayDetected && (
                        <>
                            <circle cx={BOUNDS.w * 0.75} cy={BOUNDS.h * 0.58} r={7}
                                fill="rgba(239,68,68,0.6)" style={{ filter: 'blur(3px)' }} />
                            <circle cx={BOUNDS.w * 0.75} cy={BOUNDS.h * 0.58} r={3.5} fill="#ef4444" opacity={0.95} />
                        </>
                    )}
                    {/* Mic-active ring removed as status panel now handles indication */}
                </svg>

                {/* ── Premium Status Panel ─────────────────────────────────── */}
                {isRunning && (
                    <div style={{
                        position: 'absolute', top: BOUNDS.h + 12,
                        left: '50%', transform: 'translateX(-50%)',
                        minWidth: 160,
                        background: 'var(--card, rgba(30, 30, 46, 0.85))',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: `1px solid ${displayDetected ? 'rgba(239, 68, 68, 0.4)' : 'var(--border, rgba(59, 130, 246, 0.3))'}`,
                        borderRadius: 12, padding: '12px',
                        color: 'var(--text, #e2e8f0)', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 11,
                        boxShadow: displayDetected 
                            ? '0 8px 32px rgba(239, 68, 68, 0.15)' 
                            : '0 8px 32px var(--shadow-color, rgba(0, 0, 0, 0.15))',
                        zIndex: 50, pointerEvents: 'auto', whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease',
                    }}>
                        {/* Status Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontWeight: 600, fontSize: 12 }}>Acoustic Sensor</span>
                            <div style={{ 
                                width: 8, height: 8, borderRadius: '50%', 
                                background: displayDetected ? '#ef4444' : (micActive ? '#22c55e' : 'var(--text2, #94a3b8)'),
                                boxShadow: displayDetected ? '0 0 8px #ef4444' : (micActive ? '0 0 8px #22c55e' : 'none')
                            }} title={displayDetected ? 'Sound Detected' : 'Monitoring'} />
                        </div>

                        {/* Visualizer */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, background: 'rgba(0,0,0,0.1)', borderRadius: 6, padding: '4px' }}>
                            <SoundWave level={displayLevel} detected={displayDetected} />
                        </div>

                        {/* Metrics */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text2, #94a3b8)' }}>Level</span>
                                <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{displayLevel} / 1023</span>
                            </div>
                            
                            <div style={{ background: 'var(--bg-alt, rgba(0,0,0,0.2))', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${(displayLevel / 1023) * 100}%`,
                                    background: displayDetected
                                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                                        : 'linear-gradient(90deg, #3b82f6, #22c55e)',
                                    borderRadius: 4, transition: 'width 0.1s ease-out',
                                }} />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                                <span style={{ color: 'var(--text2, #94a3b8)' }}>Threshold</span>
                                <span style={{ color: '#fbbf24', fontWeight: 500, fontFamily: 'monospace' }}>{threshold}</span>
                            </div>
                        </div>

                        {/* Interactive Mic Button */}
                        <button 
                            onClick={handleClick}
                            style={{ 
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: 'none',
                                background: micActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                color: micActive ? '#ef4444' : '#3b82f6',
                                fontWeight: 600,
                                fontSize: 11,
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'all 0.2s ease',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = micActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = micActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)';
                            }}
                        >
                            {micError ? (
                                <><span>⚠️</span> Retry Mic</>
                            ) : micActive ? (
                                <><span>⏹</span> Stop Listening</>
                            ) : (
                                <><span>🎙️</span> Enable Microphone</>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
