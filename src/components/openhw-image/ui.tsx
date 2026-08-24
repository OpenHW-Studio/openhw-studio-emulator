import React, { useRef, useState, useCallback } from 'react';

// Bounding box dynamically adjusts to width and height attrs
export const BOUNDS = (attrs: any) => {
    const w = attrs?.width || 300;
    const h = attrs?.height || 300;
    return { x: 0, y: 0, w, h };
};

// Edge/corner resize directions
type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const HANDLE_SIZE = 8; // px thickness of edge handles

const cursorMap: Record<ResizeDir, string> = {
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
    ne: 'nesw-resize',
    nw: 'nwse-resize',
    se: 'nwse-resize',
    sw: 'nesw-resize',
};

export const OpenHWImageUI = ({ state, attrs, isPalette, onUpdate, comp, updateComponentAttr }: { state: any; attrs: any; isPalette?: boolean; onUpdate?: (key: string, value: any) => void; comp?: any; updateComponentAttr?: (id: string, key: string, value: any) => void }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (isPalette) {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                color: 'var(--text, #cbd5e1)',
                fontFamily: 'sans-serif'
            }}>
                <span style={{ fontSize: '24px', fontWeight: 'bold' }}>🖼️</span>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Image</span>
            </div>
        );
    }

    const b = BOUNDS(attrs);
    const hasImage = !!attrs?.url;

    // Get canvas zoom for accurate resize math
    const getZoom = () => {
        let zoom = 1;
        const canvasInner = document.getElementById('simulator-inner-canvas');
        if (canvasInner) {
            const transform = canvasInner.style.transform;
            if (transform) {
                const match = transform.match(/scale\(([^)]+)\)/);
                if (match && match[1]) {
                    zoom = parseFloat(match[1]);
                }
            }
        }
        return zoom;
    };

    const handleResizeMouseDown = (dir: ResizeDir, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;
        const startW = attrs?.width || 300;
        const startH = attrs?.height || 300;
        const zoom = getZoom();

        const onMouseMove = (moveEvent: MouseEvent) => {
            if (!updateComponentAttr || !comp) return;

            const dx = (moveEvent.clientX - startX) / zoom;
            const dy = (moveEvent.clientY - startY) / zoom;

            let newW = startW;
            let newH = startH;

            // Horizontal
            if (dir.includes('e')) newW = Math.max(30, startW + dx);
            if (dir.includes('w')) newW = Math.max(30, startW - dx);

            // Vertical
            if (dir.includes('s')) newH = Math.max(30, startH + dy);
            if (dir.includes('n')) newH = Math.max(30, startH - dy);

            updateComponentAttr(comp.id, 'width', Math.round(newW));
            updateComponentAttr(comp.id, 'height', Math.round(newH));
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // Shared resize handles rendered on all edges and corners
    const renderResizeHandles = () => {
        // Edge handles
        const edges: { dir: ResizeDir; style: React.CSSProperties }[] = [
            // Top edge
            { dir: 'n', style: { top: -HANDLE_SIZE / 2, left: HANDLE_SIZE, right: HANDLE_SIZE, height: HANDLE_SIZE } },
            // Bottom edge
            { dir: 's', style: { bottom: -HANDLE_SIZE / 2, left: HANDLE_SIZE, right: HANDLE_SIZE, height: HANDLE_SIZE } },
            // Left edge
            { dir: 'w', style: { left: -HANDLE_SIZE / 2, top: HANDLE_SIZE, bottom: HANDLE_SIZE, width: HANDLE_SIZE } },
            // Right edge
            { dir: 'e', style: { right: -HANDLE_SIZE / 2, top: HANDLE_SIZE, bottom: HANDLE_SIZE, width: HANDLE_SIZE } },
        ];

        // Corner handles
        const corners: { dir: ResizeDir; style: React.CSSProperties }[] = [
            { dir: 'nw', style: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, width: HANDLE_SIZE * 2, height: HANDLE_SIZE * 2 } },
            { dir: 'ne', style: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, width: HANDLE_SIZE * 2, height: HANDLE_SIZE * 2 } },
            { dir: 'sw', style: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, width: HANDLE_SIZE * 2, height: HANDLE_SIZE * 2 } },
            { dir: 'se', style: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, width: HANDLE_SIZE * 2, height: HANDLE_SIZE * 2 } },
        ];

        return (
            <>
                {edges.map(({ dir, style }) => (
                    <div
                        key={dir}
                        onMouseDown={(e) => handleResizeMouseDown(dir, e)}
                        style={{
                            position: 'absolute',
                            cursor: cursorMap[dir],
                            pointerEvents: 'auto',
                            zIndex: 50,
                            ...style,
                        }}
                    />
                ))}
                {corners.map(({ dir, style }) => (
                    <div
                        key={dir}
                        onMouseDown={(e) => handleResizeMouseDown(dir, e)}
                        style={{
                            position: 'absolute',
                            cursor: cursorMap[dir],
                            pointerEvents: 'auto',
                            zIndex: 51,
                            ...style,
                        }}
                    />
                ))}
            </>
        );
    };

    if (!hasImage) {
        return (
            <div
                style={{
                    pointerEvents: 'none',
                    width: b.w,
                    height: b.h,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '2px dashed rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    gap: '8px',
                    padding: '8px',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    position: 'relative',
                }}
            >
                <div style={{ fontSize: '28px' }}>🖼️</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Image Component</div>
                <div style={{ fontSize: '10px', opacity: 0.8 }}>
                    Right-click to upload image
                </div>

                {renderResizeHandles()}
            </div>
        );
    }

    return (
        <div style={{
            pointerEvents: 'none',
            width: b.w,
            height: b.h,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
        }}>
            <img
                src={attrs.url}
                alt="User added component"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                }}
            />

            {renderResizeHandles()}
        </div>
    );
};

export const OpenHWImageContextMenu = ({
    attrs,
    onUpdate,
}: {
    attrs: any;
    onUpdate: (key: string, value: any) => void;
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Compress image before setting to prevent huge project files
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Only downscale if larger than MAX_SIZE for storage efficiency
                const MAX_SIZE = 1200;
                if (width > height && width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                onUpdate('url', dataUrl);
                
                // Auto-set the component dimensions to match the image aspect ratio
                // Use the current component width as the base, or default 300
                const currentW = attrs?.width || 300;
                const aspect = width / height;
                const newH = Math.round(currentW / aspect);
                onUpdate('width', currentW);
                onUpdate('height', newH);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 'bold' }}>Image Source:</span>
                
                <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        background: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'center'
                    }}
                >
                    Upload Local Image
                </button>

                <button 
                    onClick={() => alert('Image Library coming soon!')}
                    style={{
                        background: 'var(--bg2)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        textAlign: 'center'
                    }}
                >
                    Choose from Library
                </button>

            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 'bold' }}>Dimensions:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>W:</span>
                        <input 
                            type="number" 
                            min="10"
                            max="2000"
                            value={attrs?.width !== undefined ? attrs.width : 300} 
                            onChange={(e) => {
                                const val = e.target.value;
                                onUpdate('width', val === '' ? '' : parseInt(val, 10));
                            }}
                            style={{
                                background: 'var(--bg1)',
                                border: '1px solid var(--border)',
                                color: 'var(--text)',
                                borderRadius: '4px',
                                padding: '4px 6px',
                                fontSize: '12px',
                                width: '50px',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>H:</span>
                        <input 
                            type="number" 
                            min="10"
                            max="2000"
                            value={attrs?.height !== undefined ? attrs.height : 300} 
                            onChange={(e) => {
                                const val = e.target.value;
                                onUpdate('height', val === '' ? '' : parseInt(val, 10));
                            }}
                            style={{
                                background: 'var(--bg1)',
                                border: '1px solid var(--border)',
                                color: 'var(--text)',
                                borderRadius: '4px',
                                padding: '4px 6px',
                                fontSize: '12px',
                                width: '50px',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>
            </div>
            
            {attrs?.url && (
                <button 
                    onClick={() => onUpdate('url', '')}
                    style={{
                        background: 'transparent',
                        color: 'var(--red, #ef4444)',
                        border: '1px solid var(--red, #ef4444)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        marginTop: '4px'
                    }}
                >
                    Remove Image
                </button>
            )}
        </div>
    );
};
