
import React from 'react';
import { CredibilityLevel } from '../types';

interface Props {
  score: number;
  level: CredibilityLevel;
}

export const CredibilityGauge: React.FC<Props> = ({ score, level }) => {
  const getColor = () => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getBgColor = () => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getGlowColor = () => {
    if (score >= 80) return 'rgba(5, 150, 105, 0.5)';
    if (score >= 40) return 'rgba(217, 119, 6, 0.5)';
    return 'rgba(225, 29, 72, 0.5)';
  };

  const getIcon = () => {
    if (level === CredibilityLevel.HIGH) return 'fa-circle-check';
    if (level === CredibilityLevel.MEDIUM) return 'fa-circle-exclamation';
    if (level === CredibilityLevel.LOW) return 'fa-circle-xmark';
    return 'fa-circle-question';
  };

  // 2 * PI * r = 2 * 3.14159 * 58 = 364.42
  const circumference = 364.42;

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl flex flex-col items-center justify-center text-center transition-all hover:border-blue-900/30">
      <div className="relative w-40 h-40 flex items-center justify-center mb-6">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Background Track - Increased opacity for "full visibility" */}
          <circle
            cx="64"
            cy="64"
            r="58"
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            className="text-slate-200 opacity-100"
          />
          {/* Active Progress */}
          <circle
            cx="64"
            cy="64"
            r="58"
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (circumference * score) / 100}
            className={`${getColor()} transition-all duration-1000 ease-out`}
            strokeLinecap="round"
            style={{ 
              filter: `drop-shadow(0 0 8px ${getGlowColor()})`
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-black ${getColor()} tracking-tighter`}>{score}</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mt-1">Trust Index</span>
        </div>
      </div>
      
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${getBgColor()} bg-opacity-10 mb-3 border border-current shadow-lg shadow-current/5`}>
        <i className={`fas ${getIcon()} ${getColor()} text-lg`}></i>
        <span className={`font-black text-sm uppercase tracking-wider ${getColor()}`}>{level}</span>
      </div>
      
      <p className="text-xs text-slate-600 leading-relaxed px-4">
        Synthesized from <span className="text-blue-950 font-medium">real-time evidence</span> and probabilistic cross-referencing.
      </p>
    </div>
  );
};
