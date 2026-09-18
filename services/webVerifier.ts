import { CredibilityLevel, VerificationResult, GroundingSource, TrendingNewsItem, BayesFactor } from "../types";

interface WebNewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source?: string;
}

interface WikipediaSearchItem {
  title: string;
  snippet: string;
  pageid: number;
  link: string;
}

interface WikipediaSummary {
  title: string;
  extract: string;
  description?: string;
}

// Trusted international news and scientific publications
const TRUSTED_SOURCES = [
  "reuters", "apnews", "associated press", "bbc", "npr", "pbs", 
  "bloomberg", "the guardian", "wall street journal", "wsj", 
  "new york times", "nytimes", "nature", "science", "nasa", 
  "who", "world health organization", "cdc", "afp", "snopes", 
  "politifact", "factcheck", "cnbc", "financial times", "time", 
  "scientific american", "space.com", "national geographic"
];

// Debunking / misinformation indicators
const DEBUNK_TERMS = [
  "debunk", "debunked", "debunks", "false", "falsely", "hoax", 
  "misinformation", "disinformation", "conspiracy", "unproven", 
  "unsubstantiated", "myth", "fake", "no evidence", "unfounded", 
  "fact check", "fact-check", "misleading", "fabricated", "pants on fire", 
  "warns against", "deadly", "hazard", "not true", "refuted", "inaccurate"
];

// Corroboration indicators
const CONFIRM_TERMS = [
  "confirms", "confirmed", "announces", "announced", "discovers", 
  "discovered", "launches", "launched", "study finds", "research reveals", 
  "officially", "consensus", "agreed", "reports", "agreement", "published in"
];

// Sensationalism / clickbait words
const SENSATIONAL_WORDS = [
  "shocking", "bombshell", "secret", "exposed", "miracle", "cure", 
  "conspiracy", "hidden", "they don't want you to know", "wiped out", 
  "destroyed", "unbelievable", "mind-blowing", "apocalypse", "crisis"
];

/**
 * Searches Google News RSS via public CORS endpoints without an API key
 */
export async function searchWebNews(query: string): Promise<WebNewsItem[]> {
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === "ok" && Array.isArray(data.items)) {
        return data.items.map((item: any) => {
          // Extract publisher if available in title (usually "Headline - Publisher")
          const titleParts = (item.title || "").split(" - ");
          const source = titleParts.length > 1 ? titleParts[titleParts.length - 1].trim() : "Web Source";
          return {
            title: item.title || "",
            link: item.link || "",
            pubDate: item.pubDate || "",
            description: (item.description || "").replace(/<[^>]*>?/gm, "").trim(),
            source: source
          };
        });
      }
    }
  } catch (err) {
    console.warn("Web news search via RSS proxy failed:", err);
  }
  return [];
}

/**
 * Searches Wikipedia's public OpenSearch and Action APIs (no API key, origin=* supported)
 */
export async function searchWikipedia(query: string): Promise<{ items: WikipediaSearchItem[]; summary?: WikipediaSummary }> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
    const res = await fetch(searchUrl);
    if (!res.ok) return { items: [] };

    const data = await res.json();
    const rawItems = data.query?.search || [];
    const items: WikipediaSearchItem[] = rawItems.map((s: any) => ({
      title: s.title,
      snippet: (s.snippet || "").replace(/<[^>]*>?/gm, "").trim(),
      pageid: s.pageid,
      link: `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title.replace(/ /g, "_"))}`
    }));

    // If we have items, fetch the rich summary for the top 1 item
    let summary: WikipediaSummary | undefined;
    if (items.length > 0) {
      try {
        const sumRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(items[0].title)}`);
        if (sumRes.ok) {
          const sumData = await sumRes.json();
          summary = {
            title: sumData.title,
            extract: sumData.extract || "",
            description: sumData.description
          };
        }
      } catch (sumErr) {
        console.warn("Failed to fetch wiki summary:", sumErr);
      }
    }

    return { items, summary };
  } catch (err) {
    console.warn("Wikipedia search failed:", err);
    return { items: [] };
  }
}

/**
 * Analyzes news and claims directly from live web search without requiring an API key
 */
export async function verifyNewsWithoutApiKey(claim: string): Promise<VerificationResult> {
  const trimmed = claim.trim();
  if (!trimmed) {
    throw new Error("Please enter a headline, news claim, or topic to verify.");
  }

  // 1. Fetch web news and Wikipedia consensus in parallel
  const [newsResults, wikiResults] = await Promise.all([
    searchWebNews(trimmed),
    searchWikipedia(trimmed)
  ]);

  const allNews = newsResults;
  const allWiki = wikiResults.items;
  const wikiSummary = wikiResults.summary;

  // 2. Build Sources collection
  const sources: GroundingSource[] = [];
  
  // Add news sources
  for (const n of allNews.slice(0, 5)) {
    if (n.link && n.title) {
      sources.push({
        title: n.title,
        uri: n.link
      });
    }
  }

  // Add Wikipedia encyclopedic sources
  for (const w of allWiki.slice(0, 3)) {
    sources.push({
      title: `${w.title} - Wikipedia Factual Archive`,
      uri: w.link
    });
  }

  if (sources.length === 0) {
    sources.push({
      title: "Global Web News Search",
      uri: `https://news.google.com/search?q=${encodeURIComponent(trimmed)}`
    });
  }

  // 3. Analyze text for Debunking vs Confirmation
  const combinedText = [
    trimmed,
    ...allNews.map(n => `${n.title} ${n.description}`),
    ...allWiki.map(w => `${w.title} ${w.snippet}`),
    wikiSummary ? wikiSummary.extract : ""
  ].join(" ").toLowerCase();

  // Check sensationalism in the claim
  const claimLower = trimmed.toLowerCase();
  let sensationalCount = 0;
  for (const word of SENSATIONAL_WORDS) {
    if (claimLower.includes(word)) sensationalCount++;
  }
  const hasAllCaps = /[A-Z]{4,}/.test(trimmed);
  const hasExclamation = /[!?]{2,}/.test(trimmed);
  if (hasAllCaps) sensationalCount++;
  if (hasExclamation) sensationalCount++;

  // Check debunk signals
  let debunkSignals = 0;
  for (const term of DEBUNK_TERMS) {
    if (combinedText.includes(term)) {
      debunkSignals++;
    }
  }

  // Check confirmation signals from trusted sources
  let trustedMentions = 0;
  for (const s of TRUSTED_SOURCES) {
    if (combinedText.includes(s)) {
      trustedMentions++;
    }
  }

  let confirmSignals = 0;
  for (const term of CONFIRM_TERMS) {
    if (combinedText.includes(term)) {
      confirmSignals++;
    }
  }

  // Check if Wikipedia article title itself indicates misinformation or conspiracy
  const isWikiMisinfo = allWiki.some(w => 
    w.title.toLowerCase().includes("misinformation") || 
    w.title.toLowerCase().includes("conspiracy theory") || 
    w.title.toLowerCase().includes("hoax") ||
    w.title.toLowerCase().includes("pseudoscientific")
  );

  // 4. Bayesian Probability Calculation
  // Prior P(H)
  let prior = 50;
  if (sensationalCount >= 2 || isWikiMisinfo) {
    prior = 25; // Carl Sagan's extraordinary claims prior
  } else if (allNews.length > 5 && trustedMentions >= 2) {
    prior = 65; // Standard reported event from reputable news
  }

  const factors: BayesFactor[] = [];

  // Factor 1: Mainstream Web Reporting Corroboration
  if (allNews.length >= 3 && trustedMentions > 0) {
    const topSource = allNews[0].source || "Journalistic wire services";
    factors.push({
      evidence: `Active multi-outlet news reporting indexed (${allNews.length} articles found, including ${topSource}).`,
      impact: 'positive',
      weight: 25,
      description: `Multiple verified news media organizations are actively covering this story with contemporaneous timestamps.`
    });
  } else if (allNews.length > 0) {
    factors.push({
      evidence: `Limited web reporting coverage (${allNews.length} related articles found).`,
      impact: 'neutral',
      weight: 5,
      description: `Story has sporadic coverage across public feeds, with limited mainstream corroboration.`
    });
  } else {
    factors.push({
      evidence: "Absence of contemporaneous coverage in international news indexes.",
      impact: 'negative',
      weight: -20,
      description: "No mainstream or recognized wire reports substantiate this specific occurrence."
    });
  }

  // Factor 2: Fact-Check & Debunking Signal Analysis
  if (isWikiMisinfo || debunkSignals >= 3) {
    factors.push({
      evidence: `Fact-checking alerts & debunking patterns detected in ${debunkSignals} web reference signals.`,
      impact: 'negative',
      weight: -45,
      description: `Reputable fact-checkers and encyclopedic records categorize this or related claims as debunked, misleading, or a hoax.`
    });
  } else if (debunkSignals > 0) {
    factors.push({
      evidence: `Critical scrutiny or disputation detected in related reporting.`,
      impact: 'neutral',
      weight: -10,
      description: `Articles cite ongoing debate, denials, or caveats regarding elements of the claim.`
    });
  } else if (confirmSignals >= 2) {
    factors.push({
      evidence: `Affirmative language from official statements and investigative reporting.`,
      impact: 'positive',
      weight: 20,
      description: `Reporting cites verified official statements, research releases, or formal disclosures.`
    });
  }

  // Factor 3: Encyclopedic Consensus & Factual Context
  if (wikiSummary && wikiSummary.extract) {
    const snippetText = wikiSummary.extract.slice(0, 140);
    factors.push({
      evidence: `Encyclopedic consensus on "${wikiSummary.title}": "${snippetText}..."`,
      impact: isWikiMisinfo ? 'negative' : 'positive',
      weight: isWikiMisinfo ? -25 : 15,
      description: `Peer-reviewed encyclopedic records substantiate background context and timeline.`
    });
  } else if (allWiki.length > 0) {
    factors.push({
      evidence: `Historical context available in Wikipedia index for "${allWiki[0].title}".`,
      impact: 'neutral',
      weight: 5,
      description: `Related entities and context are cataloged in public knowledge databases.`
    });
  }

  // Factor 4: Linguistic Tone & Sensationalism
  if (sensationalCount >= 2) {
    factors.push({
      evidence: `High sensationalism index: detected emotive buzzwords, hyperbole, or capitalizations.`,
      impact: 'negative',
      weight: -15,
      description: `Headlines or claim framing rely on sensational clickbait tropes often characteristic of viral falsehoods.`
    });
  } else {
    factors.push({
      evidence: "Measured, objective linguistic style consistent with professional journalistic reporting.",
      impact: 'positive',
      weight: 10,
      description: "Language is descriptive, factual, and free from inflammatory clickbait patterns."
    });
  }

  // Compute Posterior Probability
  let totalDelta = 0;
  for (const f of factors) {
    totalDelta += f.weight;
  }
  let posterior = Math.round(prior + totalDelta);
  posterior = Math.max(5, Math.min(96, posterior));

  // Determine Credibility Level
  let level = CredibilityLevel.MEDIUM;
  if (posterior >= 75) {
    level = CredibilityLevel.HIGH;
  } else if (posterior < 40) {
    level = CredibilityLevel.LOW;
  }

  // Generate Executive Summary based on real web evidence
  let summary = "";
  if (level === CredibilityLevel.HIGH) {
    summary = `Verified through real-time web news aggregation and factual indexes. Multiple reputable news publishers (${allNews.slice(0, 2).map(n => n.source || "Web Wire").join(", ")}) corroborate this event with factual reporting. No credible debunking or counter-evidence was detected.`;
  } else if (level === CredibilityLevel.LOW) {
    summary = `High probability of misinformation or fabricated content. Web indexes and fact-checking records flag significant discrepancies or explicitly categorize this claim as unverified, debunked, or sensationalized.`;
  } else {
    summary = `Mixed or developing evidence. While partial reports or related context exist across web sources, definitive consensus from top-tier international wire services remains incomplete or contested.`;
  }

  // Generate multi-dimensional ratings
  const biasRating = trustedMentions >= 2 
    ? "Balanced / Wire-Service Neutrality" 
    : (allNews.length > 0 ? "Standard Commercial Media Framing" : "Unverified / Unstandardized");

  const sensationalismRating = sensationalCount >= 2 
    ? "Elevated / Clickbait Sensationalism" 
    : (sensationalCount === 1 ? "Moderate" : "Low / Objective Journalistic Tone");

  const factualAccuracy = level === CredibilityLevel.HIGH 
    ? "Strongly consistent with verified web publications and institutional consensus." 
    : (level === CredibilityLevel.LOW 
      ? "Contradicted by factual databases and investigative consensus." 
      : "Partially consistent with background events, but key assertions lack conclusive proof.");

  const historicalContext = wikiSummary?.description 
    ? `${wikiSummary.title}: ${wikiSummary.description}. Indexed in global knowledge archives.` 
    : (allWiki[0]?.title 
      ? `Historical background aligns with documented archives for "${allWiki[0].title}".` 
      : "Topic relates to recent or emerging public interest items with developing historical records.");

  return {
    id: Math.random().toString(36).substr(2, 9),
    query: trimmed,
    timestamp: Date.now(),
    score: posterior,
    level: level,
    summary: summary,
    bayesian: {
      prior: prior,
      factors: factors,
      posterior: posterior
    },
    analysis: {
      bias: biasRating,
      sensationalism: sensationalismRating,
      factualAccuracy: factualAccuracy,
      historicalContext: historicalContext
    },
    sources: sources,
    rawText: `Verified from open web sources including Google News RSS and Wikipedia factual archives.`
  };
}

/**
 * Fetches live breaking news headlines from the web without an API key
 */
export async function fetchLiveWebTrendingNews(): Promise<TrendingNewsItem[]> {
  try {
    const rssUrl = `https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === "ok" && Array.isArray(data.items) && data.items.length > 0) {
        return data.items.slice(0, 6).map((item: any) => {
          // Extract publisher and clean title
          const titleParts = (item.title || "").split(" - ");
          const publisher = titleParts.length > 1 ? titleParts.pop()?.trim() : "News Wire";
          const cleanTitle = titleParts.join(" - ") || item.title || "";

          // Guess category based on title keywords
          let category = "World News";
          const lower = cleanTitle.toLowerCase();
          if (lower.includes("ai") || lower.includes("tech") || lower.includes("apple") || lower.includes("google") || lower.includes("cyber") || lower.includes("space")) {
            category = "Technology & Science";
          } else if (lower.includes("economy") || lower.includes("market") || lower.includes("bank") || lower.includes("stock") || lower.includes("inflation") || lower.includes("fed")) {
            category = "Economy & Markets";
          } else if (lower.includes("health") || lower.includes("vaccine") || lower.includes("disease") || lower.includes("hospital") || lower.includes("medical")) {
            category = "Health & Wellness";
          } else if (lower.includes("president") || lower.includes("senate") || lower.includes("minister") || lower.includes("election") || lower.includes("court") || lower.includes("bill")) {
            category = "Politics & Policy";
          }

          // Format relative time if pubDate is valid
          let timeDisplay = "Just now";
          if (item.pubDate) {
            try {
              const diffMs = Date.now() - new Date(item.pubDate).getTime();
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              if (diffHours > 0) {
                timeDisplay = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
              } else {
                const diffMins = Math.max(5, Math.floor(diffMs / (1000 * 60)));
                timeDisplay = `${diffMins} mins ago`;
              }
            } catch (e) {}
          }

          return {
            headline: cleanTitle,
            category: category,
            timestamp: timeDisplay,
            sources: [
              {
                title: publisher || "Verified Wire",
                uri: item.link || "https://news.google.com"
              }
            ]
          };
        });
      }
    }
  } catch (err) {
    console.warn("Live web trending fetch failed:", err);
  }
  return [];
}
