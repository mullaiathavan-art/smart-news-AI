
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { CredibilityLevel, VerificationResult, GroundingSource, TrendingNewsItem } from "../types";

// Always obtain the API key exclusively from the environment variable.
export async function fetchLatestNews(): Promise<TrendingNewsItem[]> {
  if (!process.env.API_KEY) {
    console.warn("API Key is missing. Latest news will not be fetched.");
    return [];
  }
  
  // Create a new instance right before making the API call to ensure we use current context.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  const prompt = `Find 6 of the most significant and trending breaking news stories globally from the last 12-24 hours. Provide in structured format.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              category: { type: Type.STRING },
              timestamp: { type: Type.STRING }
            },
            required: ["headline", "category", "timestamp"]
          }
        }
      },
    });

    const newsItems: TrendingNewsItem[] = JSON.parse(response.text?.trim() || "[]");
    
    // As per Search Grounding guidelines, extract grounding chunks when using googleSearch.
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web?.title || "Source Reference",
        uri: chunk.web?.uri || ""
      }));

    // Attach extracted sources to news items to satisfy the grounding visibility requirement.
    return newsItems.map(item => ({
      ...item,
      sources: sources
    }));
  } catch (error) {
    console.error("Fetch News Error:", error);
    return [];
  }
}

export async function verifyNews(input: string): Promise<VerificationResult> {
  // Creating a new instance right before the verification call.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  
  const prompt = `
    Analyze this claim quickly using Bayesian reasoning: "${input}"
    1. Set Prior Probability P(H).
    2. Use 3-4 pieces of Evidence (E) from search.
    3. Calculate Bayes Factors and Posterior Probability.
    4. Provide analysis of Bias, Sensationalism, and Accuracy.
    Return JSON matching the schema.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        // Setting thinkingBudget to 0 for maximum responsiveness
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: 'Posterior probability score 0-100' },
            summary: { type: Type.STRING },
            bayesian: {
              type: Type.OBJECT,
              properties: {
                prior: { type: Type.NUMBER },
                factors: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      evidence: { type: Type.STRING },
                      impact: { type: Type.STRING, description: 'positive, negative, or neutral' },
                      weight: { type: Type.NUMBER },
                      description: { type: Type.STRING }
                    },
                    required: ["evidence", "impact", "weight", "description"]
                  }
                },
                posterior: { type: Type.NUMBER }
              },
              required: ["prior", "factors", "posterior"]
            },
            analysis: {
              type: Type.OBJECT,
              properties: {
                bias: { type: Type.STRING },
                sensationalism: { type: Type.STRING },
                factualAccuracy: { type: Type.STRING },
                historicalContext: { type: Type.STRING }
              },
              required: ["bias", "sensationalism", "factualAccuracy", "historicalContext"]
            }
          },
          required: ["score", "summary", "bayesian", "analysis"]
        }
      },
    });

    const data = JSON.parse(response.text?.trim() || "{}");
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Always extract website URLs from groundingChunks and list them on the app when search grounding is used.
    const sources: GroundingSource[] = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web?.title || "Source Reference",
        uri: chunk.web?.uri || ""
      }));

    let level = CredibilityLevel.UNVERIFIED;
    if (data.score >= 80) level = CredibilityLevel.HIGH;
    else if (data.score >= 40) level = CredibilityLevel.MEDIUM;
    else level = CredibilityLevel.LOW;

    return {
      id: Math.random().toString(36).substr(2, 9),
      query: input,
      timestamp: Date.now(),
      score: data.score,
      level: level,
      summary: data.summary,
      bayesian: data.bayesian,
      analysis: data.analysis,
      sources: sources,
      rawText: response.text
    };
  } catch (error: any) {
    console.error("Gemini Verification Error:", error);
    // Follow guideline: Prompt user to select key if 'Requested entity was not found' error occurs.
    if (error.message?.includes("Requested entity was not found") && window.aistudio) {
      window.aistudio.openSelectKey();
    }
    throw new Error("Failed to verify news content. Ensure your API Key is valid.");
  }
}
