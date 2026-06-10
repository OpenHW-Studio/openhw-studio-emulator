import React from 'react';

export const BOUNDS = { x: 0, y: 0, w: 60, h: 20 };

export const DiodeUI = ({ state, attrs }: { state: any, attrs: any }) => {
    return (
        <div style={{ position: 'relative', width: BOUNDS.w, height: BOUNDS.h, pointerEvents: 'none' }}>
            <svg width="100%" height="100%" viewBox="0 0 30 10" style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
                <defs>
                    {/* Brushed metal for the external leads */}
                    <linearGradient id="legMetal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9CA3AF" />
                        <stop offset="50%" stopColor="#F3F4F6" />
                        <stop offset="100%" stopColor="#6B7280" />
                    </linearGradient>
                    
                    {/* Darker copper/silver metal for internal die slugs */}
                    <linearGradient id="slugMetal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#b45309" /> 
                        <stop offset="40%" stopColor="#fcd34d" />
                        <stop offset="100%" stopColor="#78350f" />
                    </linearGradient>
                    
                    {/* Semi-transparent orange/red tint for the glass capsule */}
                    <linearGradient id="glassBody" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(239, 68, 68, 0.5)" />
                        <stop offset="30%" stopColor="rgba(239, 68, 68, 0.15)" />
                        <stop offset="70%" stopColor="rgba(239, 68, 68, 0.25)" />
                        <stop offset="100%" stopColor="rgba(153, 27, 27, 0.7)" />
                    </linearGradient>
                    
                    {/* Sharp glossy reflection on top of the glass */}
                    <linearGradient id="glassHighlight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
                        <stop offset="40%" stopColor="rgba(255, 255, 255, 0.1)" />
                        <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                    </linearGradient>
                </defs>

                {/* External Leads extending to exact breadboard anchor points */}
                <rect x="0" y="4.3" width="7" height="1.4" fill="url(#legMetal)" />
                <rect x="23" y="4.3" width="7" height="1.4" fill="url(#legMetal)" />

                {/* Internal Metal Slugs inside the glass */}
                {/* Anode Slug (left) */}
                <path d="M 5 3 L 14.5 3 L 14.5 7 L 5 7 Z" fill="url(#slugMetal)" />
                {/* Cathode Slug (right) */}
                <path d="M 15.5 3 L 25 3 L 25 7 L 15.5 7 Z" fill="url(#slugMetal)" />

                {/* Orange/Red Glass Capsule Base */}
                <rect x="5" y="1.5" width="20" height="7" rx="2" fill="url(#glassBody)" stroke="#991b1b" strokeWidth="0.5" />

                {/* Cathode Stripe Indicator */}
                <rect x="20" y="1.5" width="2.5" height="7" fill="#111827" opacity="0.9" />

                {/* Glossy White Highlight layered over glass and stripe for 3D realism */}
                <rect x="5.5" y="2" width="19" height="2" rx="1" fill="url(#glassHighlight)" />

                {/* Hidden snap points to ensure breadboard connectivity */}
                <circle cx="0" cy="5" r="1.5" fill="#333" opacity="0" />
                <circle cx="30" cy="5" r="1.5" fill="#333" opacity="0" />
            </svg>
        </div>
    );
};
