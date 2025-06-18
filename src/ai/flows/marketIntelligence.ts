
'use server';
/**
 * @fileOverview A Genkit flow for analyzing market intelligence data.
 * This flow uses an AI model to process various inputs like news, social media trends,
 * competitor actions, economic indicators, and more to provide actionable market insights.
 *
 * - analyzeMarketIntelligence - A function that processes market data and returns structured insights.
 * - MarketIntelligenceInput - The input type for the analyzeMarketIntelligence function.
 * - MarketIntelligenceOutput - The return type for the analyzeMarketIntelligence function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MarketIntelligenceInputSchema = z.object({
  topics: z.array(z.string()).describe('Specific topics, products, or industries to analyze. E.g., ["electric vehicles", "semiconductor shortages"].'),
  competitorNames: z.array(z.string()).optional().describe('List of competitor names for focused analysis.'),
  region: z.string().optional().describe('Geographic region for focused analysis, e.g., "North America", "Europe".'),
  timeRange: z.enum(['past_24_hours', 'past_week', 'past_month']).default('past_week').describe('Time range for sourcing news and social media data.'),
  customDataSources: z.array(z.object({
    type: z.enum(['news_url', 'social_media_handle', 'rss_feed', 'text_document']),
    content: z.string().describe('URL or relevant content for the custom data source.'),
  })).optional().describe('User-provided custom data sources to include in the analysis.'),
});
export type MarketIntelligenceInput = z.infer<typeof MarketIntelligenceInputSchema>;

const TrendAnalysisSchema = z.object({
  trend: z.string().describe('Identified market trend.'),
  description: z.string().describe('Brief description of the trend and its potential impact.'),
  sourceHighlights: z.array(z.string()).optional().describe('Key snippets or sources indicating this trend.'),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']).optional().describe('Overall sentiment related to this trend.'),
});

const CompetitorAnalysisSchema = z.object({
  competitorName: z.string(),
  recentActivity: z.string().describe('Summary of recent notable activities or pricing changes.'),
  potentialImpact: z.string().describe('Potential impact of these activities on our business.'),
});

const EconomicIndicatorSchema = z.object({
  indicatorName: z.string().describe('e.g., Inflation Rate, Consumer Confidence Index.'),
  value: z.string().optional().describe('Current value or recent change.'),
  impactAssessment: z.string().describe('How this indicator might affect demand or supply chain.'),
});

const EventImpactSchema = z.object({
  eventName: z.string().describe('Name of the holiday, event, or weather pattern.'),
  eventType: z.enum(['holiday', 'industry_event', 'weather_event', 'geopolitical_event']),
  potentialImpact: z.string().describe('Potential impact on supply chain or demand.'),
  affectedRegions: z.array(z.string()).optional().describe('Regions likely to be affected.'),
});

const MarketIntelligenceOutputSchema = z.object({
  summary: z.string().describe('A high-level summary of the most critical market intelligence findings.'),
  marketTrends: z.array(TrendAnalysisSchema).optional().describe('Analysis of key market trends from news, social media, etc.'),
  competitorInsights: z.array(CompetitorAnalysisSchema).optional().describe('Insights on competitor activities and pricing.'),
  economicOutlook: z.array(EconomicIndicatorSchema).optional().describe('Analysis of relevant economic indicators.'),
  eventWatch: z.array(EventImpactSchema).optional().describe('Impact assessment of upcoming holidays, events, or significant weather patterns.'),
  emergingSignals: z.array(z.string()).optional().describe('Weak signals or early indicators of potential future disruptions or opportunities.'),
  dataFreshness: z.string().describe('Indication of how up-to-date the analyzed information is, e.g., "Based on data up to YYYY-MM-DD HH:MM UTC".'),
});
export type MarketIntelligenceOutput = z.infer<typeof MarketIntelligenceOutputSchema>;

export async function analyzeMarketIntelligence(input: MarketIntelligenceInput): Promise<MarketIntelligenceOutput> {
  return marketIntelligenceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'marketIntelligencePrompt',
  input: {schema: MarketIntelligenceInputSchema},
  output: {schema: MarketIntelligenceOutputSchema},
  prompt: `You are SupplyChainAI, an expert market intelligence analyst.
Your task is to analyze the provided topics, competitor information, regional focus, and custom data sources
to generate a comprehensive market intelligence report. Consider the specified time range for news and social media.

Your analysis should cover:
1.  **Market Trends**: Identify key trends from news, social media, and other relevant sources. For each trend, describe it, its potential impact, highlight source snippets if possible, and assess sentiment.
2.  **Competitor Insights**: If competitor names are provided, analyze their recent activities, especially pricing movements or significant announcements, and assess their potential impact.
3.  **Economic Outlook**: Analyze relevant economic indicators (e.g., inflation, employment, consumer confidence) and their potential effect on demand and the supply chain.
4.  **Event Watch**: Identify upcoming holidays, major industry events, significant weather patterns, or geopolitical events that could impact the supply chain or demand. Assess their potential impact.
5.  **Emerging Signals**: Highlight any weak or early signals of potential future disruptions or opportunities.
6.  **Summary**: Provide a concise high-level summary of the most critical findings.
7.  **Data Freshness**: Indicate the recency of the information used in your analysis.

Input Parameters:
- Topics: {{{jsonStringify topics}}}
{{#if competitorNames}}
- Competitors: {{{jsonStringify competitorNames}}}
{{/if}}
{{#if region}}
- Region: {{{region}}}
{{/if}}
- Time Range for News/Social: {{{timeRange}}}
{{#if customDataSources}}
- Custom Data Sources:
  {{#each customDataSources}}
  - Type: {{type}}, Content/URL: {{content}}
  {{/each}}
{{/if}}

Please generate the market intelligence report based on real-world, up-to-date information if possible, or state if the information is illustrative.
Focus on providing actionable insights for supply chain and inventory management.
  `,
  config: {
    safetySettings: [
      {category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH'},
      {category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE'},
      {category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE'},
      {category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE'},
    ],
  },
});

const marketIntelligenceFlow = ai.defineFlow(
  {
    name: 'marketIntelligenceFlow',
    inputSchema: MarketIntelligenceInputSchema,
    outputSchema: MarketIntelligenceOutputSchema,
  },
  async (input) => {
    // In a real application, this flow might involve:
    // 1. Using Genkit tools to fetch real-time news (e.g., via NewsAPI, Google Search tool).
    // 2. Using tools to fetch social media trends (e.g., via Twitter API tool).
    // 3. Using tools to get economic data (e.g., from financial data APIs).
    // 4. Using tools to get weather forecasts.
    // 5. Pre-processing and summarizing this data before passing it to the main LLM prompt.
    // For now, we rely on the LLM's general knowledge and the information provided in customDataSources.

    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate a market intelligence report.");
    }
    // Ensure dataFreshness is set, even if illustratively by the LLM
    if (!output.dataFreshness) {
        output.dataFreshness = `Analysis based on model's knowledge cut-off or illustrative data.`;
    }
    return output;
  }
);
