
export enum CredibilityLevel {
  HIGH = 'Highly Credible',
  MEDIUM = 'Suspicious',
  LOW = 'Likely False',
  UNVERIFIED = 'Unverified'
}

export enum AppView {
  SPLASH = 'splash',
  SEARCH = 'search',
  RESULT = 'result'
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface BayesFactor {
  evidence: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // Bayes Factor (LR)
  description: string;
}

export interface VerificationResult {
  id: string;
  query: string;
  timestamp: number;
  score: number; // 0 to 100 (Posterior Probability)
  level: CredibilityLevel;
  summary: string;
  bayesian: {
    prior: number; // 0 to 100
    factors: BayesFactor[];
    posterior: number; // 0 to 100
  };
  analysis: {
    bias: string;
    sensationalism: string;
    factualAccuracy: string;
    historicalContext: string;
  };
  sources: GroundingSource[];
  rawText?: string;
}

export interface TrendingNewsItem {
  headline: string;
  category: string;
  timestamp: string;
  sources?: GroundingSource[];
}

export interface AppState {
  history: VerificationResult[];
  isAnalyzing: boolean;
  currentResult: VerificationResult | null;
  error: string | null;
  trendingNews: TrendingNewsItem[];
  isFetchingTrending: boolean;
  view: AppView;
}

export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// Global augmentation moved from Layout.tsx to avoid type declaration conflicts
declare global {
  interface Window {
    aistudio?: AIStudio;
  }
}
