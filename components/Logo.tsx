
import React from 'react';

export const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl', animate?: boolean }> = ({ size = 'md', animate = false }) => {
  const dimensions = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-24 h-24'
  };

  return (
    <div className={`${dimensions[size]} relative group`}>
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={`${animate ? 'animate-pulse' : ''} drop-shadow-2xl`}
      >
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <filter id="logo-glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Outer Hex Frame */}
        <path 
          d="M50 5L90 27.5V72.5L50 95L10 72.5V27.5L50 5Z" 
          stroke="url(#logo-grad)" 
          strokeWidth="6" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="opacity-20"
        />
        
        {/* News Sheet Abstract */}
        <rect x="25" y="30" width="50" height="40" rx="4" fill="url(#logo-grad)" />
        <rect x="32" y="40" width="36" height="4" rx="2" fill="white" fillOpacity="0.8" />
        <rect x="32" y="50" width="28" height="4" rx="2" fill="white" fillOpacity="0.8" />
        <rect x="32" y="60" width="36" height="4" rx="2" fill="white" fillOpacity="0.8" />
        
        {/* The "Verification" Scanning Ring */}
        <circle 
          cx="65" 
          cy="65" 
          r="20" 
          stroke="#10b981" 
          strokeWidth="6" 
          fill="#ffffff" 
          className={animate ? 'animate-[spin_4s_linear_infinite]' : ''}
          strokeDasharray="10 20"
        />
        
        {/* Central Check in Ring */}
        <path 
          d="M58 65L63 70L72 61" 
          stroke="#10b981" 
          strokeWidth="4" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        
        {/* Tech Corner Accents */}
        <path d="M15 35L15 25L25 25" stroke="#1e3a8a" strokeWidth="2" strokeOpacity="0.5" />
        <path d="M85 65L85 75L75 75" stroke="#1e3a8a" strokeWidth="2" strokeOpacity="0.5" />
      </svg>
    </div>
  );
};
