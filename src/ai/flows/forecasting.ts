
'use server';
/**
 * @fileOverview A Genkit flow for demand forecasting using historical sales data and seasonality factors.
 *
 * - forecastDemand - A function that predicts future demand for a given SKU.
 * - ForecastDemandInput - The input type for the forecastDemand function.
 * - ForecastDemandOutput - The return type for the forecastDemand function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ForecastDemandInputSchema = z.object({
  sku: z.string().describe('The Stock Keeping Unit (SKU) of the product to forecast.'),
  historicalSalesData: z.string().describe('JSON string of historical sales data. Example: [{"date": "YYYY-MM-DD", "quantitySold": number}, ...]. This data should be comprehensive enough for meaningful analysis.'),
  seasonalityFactors: z.string().optional().describe('A textual description of known seasonality, promotions, holidays, market trends, or other events that might impact demand.'),
});
export type ForecastDemandInput = z.infer<typeof ForecastDemandInputSchema>;

const ForecastDemandOutputSchema = z.object({
  sku: z.string().describe('The SKU for which the forecast is generated.'),
  predictions: z.object({
    '30day': z.object({
      demand: z.number().describe('Predicted demand for the next 30 days.'),
      confidence: z.enum(['High', 'Medium', 'Low']).describe('Confidence level of the 30-day prediction.'),
      explanation: z.string().optional().describe('Brief explanation for the 30-day prediction.'),
    }),
    '60day': z.object({
      demand: z.number().describe('Predicted demand for the next 60 days.'),
      confidence: z.enum(['High', 'Medium', 'Low']).describe('Confidence level of the 60-day prediction.'),
      explanation: z.string().optional().describe('Brief explanation for the 60-day prediction.'),
    }),
    '90day': z.object({
      demand: z.number().describe('Predicted demand for the next 90 days.'),
      confidence: z.enum(['High', 'Medium', 'Low']).describe('Confidence level of the 90-day prediction.'),
      explanation: z.string().optional().describe('Brief explanation for the 90-day prediction.'),
    }),
  }).describe('Demand predictions for 30, 60, and 90 day periods.'),
});
export type ForecastDemandOutput = z.infer<typeof ForecastDemandOutputSchema>;

export async function forecastDemand(input: ForecastDemandInput): Promise<ForecastDemandOutput> {
  return forecastDemandFlow(input);
}

const prompt = ai.definePrompt({
  name: 'forecastDemandPrompt',
  input: {schema: ForecastDemandInputSchema},
  output: {schema: ForecastDemandOutputSchema},
  prompt: `You are SupplyChainAI, an expert in demand forecasting.
  Analyze the provided historical sales data for SKU: {{{sku}}}.
  Consider any seasonality factors, trends, promotions, or market conditions described.
  Historical Sales Data (JSON):
  \`\`\`${'json'}
  {{{historicalSalesData}}}
  \`\`\`

  Seasonality Factors/Market Conditions (if any):
  {{{seasonalityFactors}}}

  Based on this information, predict the demand for the SKU for the next 30, 60, and 90 days.
  Provide a numerical demand prediction and a confidence level (High, Medium, or Low) for each period.
  Optionally, provide a brief explanation for each period's prediction.
  Return the SKU in your output.
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

const forecastDemandFlow = ai.defineFlow(
  {
    name: 'forecastDemandFlow',
    inputSchema: ForecastDemandInputSchema,
    outputSchema: ForecastDemandOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate a demand forecast.");
    }
    return output;
  }
);
