
import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { AIStudio } from '../types';

// The global Window augmentation is now handled in types.ts to prevent subsequent declaration errors.

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-default flex-shrink-0">
              <Logo size="sm" />
              <span className="font-bold text-blue-950 tracking-tighter uppercase">Smart News Analyser</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
