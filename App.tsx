import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { AnalysisResult } from './components/AnalysisResult';
import { Logo } from './components/Logo';
import { ApiKeyModal } from './components/ApiKeyModal';
import { verifyNews, fetchLatestNews, hasActiveApiKey } from './services/gemini';
import { AppState, VerificationResult, AppView } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    history: [],
    isAnalyzing: false,
    currentResult: null,
    error: null,
    trendingNews: [],
    isFetchingTrending: false,
    view: AppView.SPLASH,
  });
  
  const [input, setInput] = useState('');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Monitor connectivity for Android APK offline support
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for PWA / Android install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Android hardware back button & browser navigation support
  useEffect(() => {
    const handlePopState = () => {
      if (isKeyModalOpen) {
        setIsKeyModalOpen(false);
        return;
      }
      setState(prev => {
        if (prev.view === AppView.RESULT) {
          return { ...prev, view: AppView.SEARCH, currentResult: null };
        }
        return prev;
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isKeyModalOpen]);

  useEffect(() => {
    if (state.view === AppView.SPLASH) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, view: AppView.SEARCH }));
      }, 2400);
      return () => clearTimeout(timer);
    }
  }, [state.view]);

  const loadTrending = async () => {
    setState(prev => ({ ...prev, isFetchingTrending: true }));
    try {
      const news = await fetchLatestNews();
      setState(prev => ({ ...prev, trendingNews: news, isFetchingTrending: false }));
    } catch (err) {
      console.error("Error fetching trending news", err);
      setState(prev => ({ ...prev, isFetchingTrending: false }));
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('veritas_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(prev => ({ ...prev, history: parsed }));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
    loadTrending();
  }, []);

  useEffect(() => {
    localStorage.setItem('veritas_history', JSON.stringify(state.history));
  }, [state.history]);

  const handleVerify = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const query = overrideInput || input;
    if (!query.trim() || state.isAnalyzing) return;

    // Push history state so Android back button returns to Search view
    window.history.pushState({ view: 'result' }, '');

    setState(prev => ({ 
      ...prev, 
      isAnalyzing: true, 
      error: null, 
      currentResult: null,
      view: AppView.RESULT 
    }));
    
    if (overrideInput) setInput(overrideInput);

    try {
      const result = await verifyNews(query);
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        currentResult: result,
        history: [result, ...prev.history].slice(0, 10),
      }));
    } catch (err: any) {
      let message = err.message || 'An unexpected error occurred.';
      if (message === 'API_KEY_REQUIRED') {
        message = 'Please configure your Gemini API Key in Settings to begin fact-checking claims.';
      }
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: message,
        view: AppView.RESULT
      }));
    }
  };

  const handleHistoryItemClick = (item: VerificationResult) => {
    window.history.pushState({ view: 'result' }, '');
    setState(prev => ({ ...prev, currentResult: item, view: AppView.RESULT, error: null }));
    setInput(item.query);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (window.history.state?.view === 'result') {
      window.history.back();
    } else {
      setState(prev => ({ ...prev, view: AppView.SEARCH, currentResult: null, error: null }));
      setInput('');
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  if (state.view === AppView.SPLASH) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center overflow-hidden">
        <div className="relative px-4 text-center">
          <div className="absolute inset-0 bg-blue-200 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="relative animate-in zoom-in duration-1000 flex flex-col items-center">
            <div className="mb-8">
              <Logo size="lg" animate />
            </div>
            <h1 className="text-2xl font-extrabold text-blue-950 tracking-tighter mb-4 uppercase whitespace-nowrap">
              Smart News <span className="text-blue-700">Analyser</span>
            </h1>
            <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-blue-900 to-emerald-500 animate-[loading_2.2s_ease-in-out_forwards]"></div>
            </div>
            <p className="mt-5 text-slate-500 text-[9px] font-black tracking-[0.25em] uppercase opacity-80">
              Evidence Engine Ready
            </p>
          </div>
        </div>
        <style>{`
          @keyframes loading {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Layout>
      {/* Top Floating Controls for Android / Mobile */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            title="Install App"
          >
            <i className="fas fa-download text-[10px]"></i>
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}
        <button
          onClick={() => setIsKeyModalOpen(true)}
          className="bg-white/90 hover:bg-white text-slate-700 hover:text-blue-950 border border-slate-200 shadow-sm text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur active:scale-95 transition-all"
          title="API Key Configuration"
        >
          <i className="fas fa-key text-blue-800 text-[11px]"></i>
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 sm:right-auto z-50 bg-slate-900/90 text-white px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-xl backdrop-blur">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>Offline Mode — Cached data active.</span>
        </div>
      )}

      {state.view === AppView.SEARCH ? (
        <div className="max-w-4xl mx-auto px-4 py-10 md:py-16 animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="text-center mb-10 pt-4">
            <h1 className="text-4xl md:text-6xl font-black text-blue-950 mb-4 tracking-tight leading-tight">
              Unmask the Truth. <br/>
              <span className="text-blue-700">In Real-Time.</span>
            </h1>
            <p className="text-base md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Verify any news headline, social media claim, or URL using Google's most powerful AI search grounding.
            </p>
          </div>

          <div className="bg-white p-2 md:p-3 rounded-3xl shadow-xl border border-slate-200 mb-10 transition-all focus-within:ring-4 ring-blue-900/10">
            <form onSubmit={handleVerify} className="flex flex-col md:flex-row gap-3">
              <div className="flex-grow relative">
                <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste a headline or claim..."
                  className="w-full pl-14 pr-6 py-4 md:py-5 rounded-2xl text-blue-950 text-base md:text-lg placeholder:text-slate-400 focus:outline-none bg-slate-50 border-none"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-900 px-8 md:px-10 py-4 md:py-5 rounded-2xl font-bold text-white text-base md:text-lg hover:bg-blue-800 transition-all active:scale-95 shadow-lg shadow-blue-900/20 text-center"
              >
                Analyze
              </button>
            </form>
          </div>

          {/* Trending Grid */}
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg md:text-xl font-bold text-blue-950 flex items-center gap-3">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                Breaking Topics
              </h3>
              <button 
                onClick={loadTrending}
                className="text-xs font-bold text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                {state.isFetchingTrending ? 'Fetching...' : 'Refresh'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {state.isFetchingTrending ? (
                [1,2,3].map(i => <div key={i} className="h-40 bg-white rounded-3xl animate-pulse border border-slate-200"></div>)
              ) : (
                state.trendingNews.map((news, i) => (
                  <div 
                    key={i}
                    onClick={() => handleVerify(undefined, news.headline)}
                    className="group bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-900 hover:shadow-xl hover:shadow-blue-900/10 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-800 mb-2 block">{news.category}</span>
                      <h4 className="font-bold text-blue-950 text-base md:text-lg line-clamp-2 leading-snug group-hover:text-blue-700 transition-colors">
                        {news.headline}
                      </h4>
                      {news.sources && news.sources.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {news.sources.slice(0, 2).map((source, idx) => (
                            <span key={idx} className="text-[8px] text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded uppercase truncate max-w-[100px]">
                              {source.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-5 flex items-center text-xs font-bold text-slate-500 group-hover:text-blue-800 transition-colors">
                      Run Check <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {state.history.length > 0 && (
            <div className="pt-8 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Recent Checks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.history.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => handleHistoryItemClick(item)}
                    className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-900/50 cursor-pointer transition-all shadow-sm"
                  >
                    <div className={`w-2 h-10 rounded-full flex-shrink-0 ${item.score > 70 ? 'bg-emerald-500' : item.score > 40 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                    <div className="flex-grow overflow-hidden">
                      <h4 className="font-bold text-blue-950 text-sm truncate">{item.query}</h4>
                      <p className="text-xs text-slate-500">{item.level} • {new Date(item.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 animate-in fade-in slide-in-from-right-6 duration-300">
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={goBack}
              className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-blue-950 hover:border-blue-900/30 transition-all shadow-sm active:scale-95"
              aria-label="Go Back"
            >
              <i className="fas fa-arrow-left text-base"></i>
            </button>
            <div className="overflow-hidden">
              <h2 className="text-xl md:text-2xl font-bold text-blue-950">Analysis Result</h2>
              <p className="text-xs md:text-sm text-slate-500 truncate max-w-[240px] sm:max-w-md">{input}</p>
            </div>
          </div>

          {state.isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-20 md:py-32 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-slate-200 border-t-blue-900 rounded-full animate-spin"></div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-blue-950">Analyzing</h3>
              </div>
            </div>
          ) : state.error ? (
            <div className="bg-rose-50 border border-rose-200 p-8 rounded-3xl text-center max-w-lg mx-auto shadow-sm">
              <i className="fas fa-circle-exclamation text-4xl text-rose-600 mb-4"></i>
              <h3 className="text-lg font-bold text-rose-900 mb-2">Notice</h3>
              <p className="text-rose-700 mb-6 text-sm leading-relaxed">{state.error}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={goBack} 
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-2.5 rounded-xl font-bold text-xs transition-colors"
                >
                  Try Another Claim
                </button>
                <button 
                  onClick={() => setIsKeyModalOpen(true)} 
                  className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <i className="fas fa-key"></i>
                  <span>Settings / API Key</span>
                </button>
              </div>
            </div>
          ) : state.currentResult ? (
            <AnalysisResult result={state.currentResult} />
          ) : null}
        </div>
      )}

      {/* API Key Modal for Mobile / APK Configuration */}
      <ApiKeyModal 
        isOpen={isKeyModalOpen} 
        onClose={() => setIsKeyModalOpen(false)} 
        onKeySaved={() => {
          loadTrending();
        }}
      />
    </Layout>
  );
};

export default App;
