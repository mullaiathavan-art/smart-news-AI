
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { AnalysisResult } from './components/AnalysisResult';
import { Logo } from './components/Logo';
import { verifyNews, fetchLatestNews } from './services/gemini';
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

  useEffect(() => {
    if (state.view === AppView.SPLASH) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, view: AppView.SEARCH }));
      }, 3000);
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
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: err.message || 'An unexpected error occurred.',
        view: AppView.SEARCH
      }));
    }
  };

  const handleHistoryItemClick = (item: VerificationResult) => {
    setState(prev => ({ ...prev, currentResult: item, view: AppView.RESULT }));
    setInput(item.query);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setState(prev => ({ ...prev, view: AppView.SEARCH, currentResult: null }));
    setInput('');
  };

  if (state.view === AppView.SPLASH) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center overflow-hidden">
        <div className="relative px-4 text-center">
          <div className="absolute inset-0 bg-blue-200 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="relative animate-in zoom-in duration-1000 flex flex-col items-center">
            <div className="mb-10">
              <Logo size="lg" animate />
            </div>
            <h1 className="text-2xl font-extrabold text-blue-950 tracking-tighter mb-4 uppercase whitespace-nowrap">
              Smart News <span className="text-blue-700">Analyser</span>
            </h1>
            <div className="w-48 h-0.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-blue-900 to-emerald-500 animate-[loading_2.5s_ease-in-out_forwards]"></div>
            </div>
            <p className="mt-6 text-slate-500 text-[8px] font-black tracking-[0.3em] uppercase opacity-80">
              Initializing Probabilistic Evidence Engine
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
      {state.view === AppView.SEARCH ? (
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-black text-blue-950 mb-6 tracking-tight leading-tight">
              Unmask the Truth. <br/>
              <span className="text-blue-700">In Real-Time.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Verify any news headline, social media claim, or URL using Google's most powerful AI search grounding.
            </p>
          </div>

          <div className="bg-white p-2 md:p-3 rounded-3xl shadow-xl border border-slate-200 mb-12 transition-all focus-within:ring-4 ring-blue-900/10">
            <form onSubmit={handleVerify} className="flex flex-col md:flex-row gap-3">
              <div className="flex-grow relative">
                <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste a headline or URL..."
                  className="w-full pl-14 pr-6 py-5 rounded-2xl text-blue-950 text-lg placeholder:text-slate-400 focus:outline-none bg-slate-50 border-none"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-900 px-10 py-5 rounded-2xl font-bold text-white text-lg hover:bg-blue-800 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
              >
                Analyze
              </button>
            </form>
          </div>

          {/* Trending Grid */}
          <div className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-blue-950 flex items-center gap-3">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                Breaking Topics
              </h3>
              <button 
                onClick={loadTrending}
                className="text-sm font-bold text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors"
              >
                {state.isFetchingTrending ? 'Fetching...' : 'Refresh'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-800 mb-3 block">{news.category}</span>
                      <h4 className="font-bold text-blue-950 text-lg line-clamp-2 leading-snug group-hover:text-blue-700 transition-colors">
                        {news.headline}
                      </h4>
                      {/* Search grounding requirement: Extract and list URLs from grounding metadata */}
                      {news.sources && news.sources.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {news.sources.slice(0, 3).map((source, idx) => (
                            <span key={idx} className="text-[7px] text-slate-500 border border-slate-200 px-1 rounded uppercase truncate max-w-[60px]">
                              {new URL(source.uri).hostname.replace('www.', '')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-6 flex items-center text-xs font-bold text-slate-500 group-hover:text-blue-800 transition-colors">
                      Run Check <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {state.history.length > 0 && (
            <div className="pt-10 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-500 uppercase tracking-widest mb-8">Recent Checks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.history.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => handleHistoryItemClick(item)}
                    className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-900/50 cursor-pointer transition-all shadow-sm"
                  >
                    <div className={`w-2 h-10 rounded-full ${item.score > 70 ? 'bg-emerald-500' : item.score > 40 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
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
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="flex items-center gap-4 mb-10">
            <button 
              onClick={goBack}
              className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-900 hover:border-blue-900/30 transition-all shadow-sm"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h2 className="text-2xl font-bold text-blue-950">Analysis Result</h2>
              <p className="text-sm text-slate-500 truncate max-w-[200px] sm:max-w-md">{input}</p>
            </div>
          </div>

          {state.isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-20 md:py-32 space-y-8">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-slate-200 border-t-blue-900 rounded-full animate-spin"></div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-blue-950 mb-2">Analyzing</h3>
              </div>
            </div>
          ) : state.error ? (
            <div className="bg-rose-50 border border-rose-200 p-8 rounded-3xl text-center">
              <i className="fas fa-circle-exclamation text-4xl text-rose-600 mb-4"></i>
              <h3 className="text-lg font-bold text-rose-900 mb-2">Verification Failed</h3>
              <p className="text-rose-700 mb-6">{state.error}</p>
              <button onClick={goBack} className="bg-rose-700 text-white px-8 py-3 rounded-xl font-bold">Try Again</button>
            </div>
          ) : state.currentResult ? (
            <AnalysisResult result={state.currentResult} />
          ) : null}
        </div>
      )}
    </Layout>
  );
};

export default App;
