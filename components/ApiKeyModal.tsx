import React, { useState, useEffect } from 'react';
import { getEffectiveApiKey, getUserApiKey, setUserApiKey } from '../services/gemini';
import { GoogleGenAI } from '@google/genai';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onKeySaved }) => {
  const [inputKey, setInputKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hasCustomKey, setHasCustomKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const currentCustom = getUserApiKey();
      setInputKey(currentCustom);
      setHasCustomKey(!!currentCustom);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setUserApiKey(inputKey);
    setHasCustomKey(!!inputKey.trim());
    setTestResult({
      success: true,
      message: inputKey.trim() ? "Personal API Key saved successfully!" : "Custom key removed. Using system default key."
    });
    if (onKeySaved) onKeySaved();
  };

  const handleClear = () => {
    setInputKey('');
    setUserApiKey('');
    setHasCustomKey(false);
    setTestResult({
      success: true,
      message: "Custom key removed. Reverted to default key."
    });
    if (onKeySaved) onKeySaved();
  };

  const handleTest = async () => {
    const keyToTest = inputKey.trim() || getEffectiveApiKey();
    if (!keyToTest) {
      setTestResult({ success: false, message: "Please enter an API Key to test." });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: keyToTest });
      const res = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'Ping',
        config: { maxOutputTokens: 5 }
      });
      if (res.text !== undefined) {
        setTestResult({ success: true, message: "Connection successful! Gemini API Key is active and verified." });
      } else {
        setTestResult({ success: false, message: "Connected, but empty response received." });
      }
    } catch (err: any) {
      console.error("API Key Test Error:", err);
      let msg = err.message || "Failed to connect with this key.";
      if (msg.includes("API_KEY_INVALID") || msg.includes("not valid")) {
        msg = "Invalid API Key. Please check the key from Google AI Studio.";
      } else if (msg.includes("RESOURCE_EXHAUSTED")) {
        msg = "Key is valid, but rate limits / quota are currently exhausted.";
      }
      setTestResult({ success: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  const activeKey = getEffectiveApiKey();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-100">
              <i className="fas fa-key text-base"></i>
            </div>
            <div>
              <h3 className="text-lg font-black text-blue-950">Settings</h3>
              <p className="text-xs text-slate-500">Gemini AI Configuration (Optional)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Current status */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Fact-Checking Mode:</span>
            <span className="font-bold flex items-center gap-1.5 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {activeKey ? (hasCustomKey ? 'Gemini AI + Web Grounding' : 'Gemini AI Active') : 'Live Web Search (No Key Required)'}
            </span>
          </div>
          {activeKey && (
            <div className="flex justify-between items-center pt-1 font-mono text-[11px] text-slate-400">
              <span>Active Key:</span>
              <span>••••••••{activeKey.slice(-4)}</span>
            </div>
          )}
        </div>

        {/* Input section */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Optional Gemini API Key
          </label>
          <input 
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="AIzaSy... (Optional)"
            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all font-mono text-slate-800"
          />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            News verification works automatically without an API key by analyzing live web sources and knowledge archives. Adding a Gemini key is optional.
          </p>
        </div>

        {testResult && (
          <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
            testResult.success 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            <i className={`fas ${testResult.success ? 'fa-check-circle text-emerald-600' : 'fa-exclamation-triangle text-rose-600'} mt-0.5`}></i>
            <span className="leading-snug">{testResult.message}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-md shadow-blue-900/10 active:scale-95 text-center"
          >
            Save Key
          </button>
          
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors active:scale-95 disabled:opacity-50 text-center flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Testing...</span>
              </>
            ) : (
              <>
                <i className="fas fa-vial"></i>
                <span>Test Connection</span>
              </>
            )}
          </button>

          {hasCustomKey && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-medium text-center"
              title="Clear Custom Key"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
