export const BOUNDS = { x: 0, y: 0, w: 240, h: 167 };

import React, { useState, useRef, useCallback, useEffect } from 'react';
import padImage from './RainDropPad.png';

const W = 300, H = 220;
type CloudMode = 'dry' | 'heavy';

const RainStreak = ({ x, delay, dur, length }: { x: number; delay: number; dur: number; length: number }) => (
    <line x1={x} y1={25} x2={x - 1.5} y2={25 + length} stroke="url(#rainGrad)" strokeWidth={2.2} opacity="0.8">
        <animate attributeName="y1" values={`25;280`} dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
        <animate attributeName="y2" values={`${25 + length};${280 + length}`} dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;1;1;0" dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
    </line>
);

export const RaindropPadUI = ({ state, attrs, isRunning }: { state: any; attrs: any; isRunning: boolean }) => {
    const [cloudMode, setCloudMode] = useState<CloudMode>('heavy');
    const [cloudPos, setCloudPos] = useState({ x: 0, y: -150 });
    const [isDragging, setIsDragging] = useState(false);
    const [rainLevel, setRainLevel] = useState(0);
    const lastEmittedTime = useRef(0);
    const pendingTimeout = useRef<any>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const isSidebar = !attrs?.id;

    const triggerRainLevel = useCallback((level: number) => {
        if (!attrs?.onInteract) return;
        
        const now = Date.now();
        if (now - lastEmittedTime.current >= 100) {
            lastEmittedTime.current = now;
            attrs.onInteract({ type: 'rain_level', value: level });
            if (pendingTimeout.current) {
                clearTimeout(pendingTimeout.current);
                pendingTimeout.current = null;
            }
        } else if (!pendingTimeout.current) {
            pendingTimeout.current = setTimeout(() => {
                lastEmittedTime.current = Date.now();
                pendingTimeout.current = null;
                attrs.onInteract({ type: 'rain_level', value: level });
            }, 100 - (now - lastEmittedTime.current));
        }
    }, [attrs]);

    const calculateRainLevel = useCallback((x: number, y: number, mode: CloudMode) => {
        if (mode === 'dry') {
            setRainLevel(0);
            triggerRainLevel(0);
            return;
        }
        // Proximity-based exactly like MQ2
        const dx = x - (BOUNDS.w / 2);
        const dy = y - (BOUNDS.h / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        let level = 0;
        if (dist <= 30) {
            level = 1023;
        } else if (dist >= 250) {
            level = 0;
        } else {
            const ratio = 1 - ((dist - 30) / 220);
            level = Math.round(ratio * 1023);
        }
        setRainLevel(level);
        triggerRainLevel(level);
    }, [triggerRainLevel]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isRunning) return;
        e.stopPropagation();
        e.preventDefault();
        setIsDragging(true);
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !svgRef.current) return;
        e.stopPropagation();
        const rect = svgRef.current.getBoundingClientRect();
        const svgX = ((e.clientX - rect.left) / rect.width) * 400;
        const svgY = ((e.clientY - rect.top) / rect.height) * 400;
        const newX = svgX - 200 + (BOUNDS.w / 2);
        const newY = svgY - 200 + (BOUNDS.h / 2);
        setCloudPos({ x: newX, y: newY });
        calculateRainLevel(newX, newY, cloudMode);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        e.stopPropagation();
        setIsDragging(false);
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    };

    const toggleCloud = (e: React.MouseEvent) => {
        if (!isRunning || isDragging) return;
        e.stopPropagation();
        const next: CloudMode = cloudMode === 'dry' ? 'heavy' : 'dry';
        setCloudMode(next);
        calculateRainLevel(cloudPos.x, cloudPos.y, next);
    };

    useEffect(() => {
        if (!isRunning) {
            setRainLevel(0);
            triggerRainLevel(0);
            setCloudMode('heavy');
            setCloudPos({ x: 0, y: -150 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRunning]);

    const intensity = rainLevel / 1023;
    const PADDING = -8;
    const imgW = W - (PADDING * 2);
    const imgH = H;
    const statusLabel = cloudMode === 'dry' ? '☀️ Dry' : rainLevel > 700 ? '⛈️ Heavy' : rainLevel > 200 ? '🌦 Light' : '🌤 Low';

    return (
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, transform: isSidebar ? 'scale(0.8)' : 'none', transformOrigin: 'top left' }}>
            {isRunning && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, zIndex: 100, pointerEvents: 'none' }}>
                    <svg ref={svgRef} style={{ position: 'absolute', left: -200 + (W / 2), top: -200 + (H / 2), width: 400, height: 400, overflow: 'visible', pointerEvents: 'none' }}>
                        <defs>
                            <linearGradient id="rainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                                <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
                                <stop offset="100%" stopColor="#93c5fd" stopOpacity="0" />
                            </linearGradient>
                            <filter id="cloudBlur"><feGaussianBlur stdDeviation="3.5" /></filter>
                        </defs>

                        {/* Dashed line from sensor to cloud */}
                        <line
                            x1={cloudPos.x + 200 - (BOUNDS.w / 2)} y1={cloudPos.y + 200 - (BOUNDS.h / 2)}
                            x2={200} y2={200}
                            stroke={isDragging ? "#3b82f6" : "#94a3b8"} strokeWidth="1.5" strokeDasharray="4,4" opacity="0.4"
                        />

                        {/* Draggable Cloud */}
                        <g
                            transform={`translate(${cloudPos.x + 200 - (BOUNDS.w / 2)}, ${cloudPos.y + 200 - (BOUNDS.h / 2)})`}
                            style={{ pointerEvents: 'auto', cursor: isDragging ? 'grabbing' : 'grab' }}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={toggleCloud}
                        >
                            {/* Rain streaks for heavy mode */}
                            {cloudMode === 'heavy' && (<>
                                <RainStreak x={-70} delay={0.0} dur={0.8} length={20} />
                                <RainStreak x={-35} delay={0.3} dur={1.1} length={18} />
                                <RainStreak x={0}   delay={0.6} dur={0.9} length={25} />
                                <RainStreak x={35}  delay={0.1} dur={1.0} length={20} />
                                <RainStreak x={70}  delay={0.4} dur={0.7} length={22} />
                                <RainStreak x={-55} delay={0.5} dur={0.7} length={22} />
                                <RainStreak x={-20} delay={0.4} dur={0.8} length={24} />
                                <RainStreak x={-10} delay={0.0} dur={0.6} length={17} />
                                <RainStreak x={15}  delay={0.3} dur={0.7} length={21} />
                                <RainStreak x={45}  delay={0.2} dur={0.8} length={23} />
                                <RainStreak x={55}  delay={0.4} dur={0.6} length={18} />
                                <RainStreak x={85}  delay={0.1} dur={0.7} length={20} />
                            </>)}

                            {/* Cloud Body */}
                            <g filter="url(#cloudBlur)">
                                {cloudMode === 'heavy' ? (<>
                                    <ellipse cx={0} cy={0} rx={75} ry={40} fill="#94a3b8" />
                                    <ellipse cx={-45} cy={15} rx={50} ry={35} fill="#64748b" />
                                    <ellipse cx={45} cy={15} rx={55} ry={38} fill="#475569" />
                                    <ellipse cx={0} cy={25} rx={65} ry={30} fill="#94a3b8" />
                                </>) : (<>
                                    <ellipse cx={0} cy={0} rx={75} ry={40} fill="#f1f5f9" />
                                    <ellipse cx={-45} cy={15} rx={50} ry={35} fill="#e2e8f0" />
                                    <ellipse cx={45} cy={15} rx={55} ry={38} fill="#cbd5e1" />
                                    <ellipse cx={0} cy={25} rx={65} ry={30} fill="#f1f5f9" />
                                </>)}
                            </g>

                            <text x={0} y={-52} textAnchor="middle" fill={cloudMode === 'heavy' ? '#60a5fa' : '#94a3b8'} fontSize={11} fontFamily="monospace" fontWeight="bold">
                                {cloudMode === 'dry' ? '☀️ DRY' : '⛈️ HEAVY'} · click to toggle
                            </text>
                            <circle cx="0" cy="0" r="6" fill={isDragging ? "#3b82f6" : "#475569"} stroke="white" strokeWidth="2" />
                        </g>
                    </svg>
                </div>
            )}

            <div style={{ position: 'relative', width: W, height: H }}>
                <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }}>
                    <image href={padImage} x={PADDING} y={PADDING} width={imgW} height={imgH} preserveAspectRatio="xMidYMid meet" />
                    {intensity > 0 && (
                        <rect x={PADDING + 25} y={PADDING + 23} width={imgW - 75} height={imgH - 40}
                            fill={`rgba(30,120,200,${intensity * 0.4})`}
                            style={{ transition: 'fill 0.3s', pointerEvents: 'none' }}
                        />
                    )}
                </svg>

                {isRunning && (
                    <div style={{
                        position: 'absolute', top: H + 6, left: '50%', transform: 'translateX(-50%)',
                        minWidth: 130, background: '#1e1e2e',
                        border: `1.5px solid ${rainLevel > 0 ? '#60a5fa' : '#475569'}`,
                        borderRadius: 8, padding: '5px 10px',
                        color: '#e2e8f0', fontFamily: 'monospace', fontSize: 10,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        zIndex: 50, pointerEvents: 'none', whiteSpace: 'nowrap',
                    }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', color: '#60a5fa' }}>{statusLabel}</div>
                        <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: 2 }}>Level: {rainLevel} / 1023</div>
                        <div style={{ textAlign: 'center', fontSize: 8, color: '#64748b', marginTop: 1 }}>Drag cloud · Click to toggle</div>
                    </div>
                )}
            </div>
        </div>
    );
};
