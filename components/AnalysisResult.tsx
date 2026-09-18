
import React from 'react';
import { VerificationResult } from '../types';
import { CredibilityGauge } from './CredibilityGauge';

interface Props {
  result: VerificationResult;
}

export const AnalysisResult: React.FC<Props> = ({ result }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-1 space-y-6">
        <CredibilityGauge score={result.score} level={result.level} />
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl">
          <h3 className="text-sm font-bold text-blue-950 mb-4 flex items-center gap-2">
            <i className="fas fa-link text-blue-700"></i>
            Verification Sources
          </h3>
          <div className="space-y-3">
            {result.sources.length > 0 ? (
              result.sources.map((source, i) => (
                <a 
                  key={i} 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-900/50 hover:bg-blue-50 transition-all group"
                >
                  <p className="text-xs font-medium text-blue-950 group-hover:text-blue-800 line-clamp-1">
                    {source.title}
                  </p>
                  <span className="text-[10px] text-slate-500 break-all">
                    {(() => {
                      try {
                        return new URL(source.uri).hostname.replace(/^www\./, '');
                      } catch {
                        return source.uri || 'Source';
                      }
                    })()}
                  </span>
                </a>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No external sources indexed for this specific query.</p>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
          <div className="mb-6 pb-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-blue-950 mb-2">Executive Summary</h2>
            <p className="text-slate-600 leading-relaxed">{result.summary}</p>
          </div>

          <div className="space-y-8">
            <AnalysisItem 
              icon="fa-scale-balanced" 
              title="Media Bias Rating" 
              content={result.analysis.bias} 
              color="text-indigo-700"
              bg="bg-indigo-100"
            />
            <AnalysisItem 
              icon="fa-bullhorn" 
              title="Sensationalism Check" 
              content={result.analysis.sensationalism} 
              color="text-amber-600"
              bg="bg-amber-100"
            />
            <AnalysisItem 
              icon="fa-circle-check" 
              title="Factual Consistency" 
              content={result.analysis.factualAccuracy} 
              color="text-emerald-700"
              bg="bg-emerald-100"
            />
            <AnalysisItem 
              icon="fa-clock-rotate-left" 
              title="Temporal Context" 
              content={result.analysis.historicalContext} 
              color="text-blue-700"
              bg="bg-blue-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalysisItem: React.FC<{ icon: string; title: string; content: string; color: string; bg: string }> = ({ icon, title, content, color, bg }) => (
  <div className="flex gap-4">
    <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color}`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <div>
      <h4 className="text-sm font-bold text-blue-950 mb-1">{title}</h4>
      <p className="text-sm text-slate-600 leading-relaxed">{content}</p>
    </div>
  </div>
);
