
'use server';
/**
 * @fileOverview A Genkit flow for demand forecasting using historical sales data and seasonality factors,
 * allowing selection from multiple forecasting models.
 *
 * - forecastDemand - A function that predicts future demand for a given SKU using a specified model.
 * - ForecastDemandInput - The input type for the forecastDemand function.
 * - ForecastDemandOutput - The return type for the forecastDemand function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModelTypeSchema = z.enum([
  "SIMPLE_MOVING_AVERAGE",
  "EXPONENTIAL_SMOOTHING",
  "SEASONAL_DECOMPOSITION",
  "AI_PATTERN_RECOGNITION",
  "REGRESSION_ANALYSIS",
  "ENSEMBLE_COMBINED"
]).describe("The type of forecasting model to use.");
export type ModelType = z.infer<typeof ModelTypeSchema>;

const ForecastDemandInputSchema = z.object({
  sku: z.string().describe('The Stock Keeping Unit (SKU) of the product to forecast.'),
  historicalSalesData: z.string().describe('JSON string of historical sales data. Example: [{"date": "YYYY-MM-DD", "quantitySold": number}, ...]. This data should be comprehensive enough for meaningful analysis.'),
  seasonalityFactors: z.string().optional().describe('A textual description of known seasonality, promotions, holidays, market trends, or other events that might impact demand.'),
  modelType: ModelTypeSchema.default("AI_PATTERN_RECOGNITION").describe("The forecasting model to apply."),
  // Future: Add inputs for regression (e.g., price, ad spend) or specific model parameters
});
export type ForecastDemandInput = z.infer<typeof ForecastDemandInputSchema>;

const PredictionPeriodSchema = z.object({
  demand: z.number().describe('Predicted demand for the period.'),
  confidence: z.enum(['High', 'Medium', 'Low']).describe('Confidence level of the prediction.'),
  explanation: z.string().optional().describe('Brief explanation for this period\'s prediction, considering the model used.'),
  confidenceInterval: z.object({
    lowerBound: z.number().describe("Illustrative lower bound of the prediction for this period."),
    upperBound: z.number().describe("Illustrative upper bound of the prediction for this period."),
  }).optional().describe("An illustrative confidence interval (e.g., 5th and 95th percentile).")
});

const ForecastDemandOutputSchema = z.object({
  sku: z.string().describe('The SKU for which the forecast is generated.'),
  modelUsed: ModelTypeSchema.describe("The forecasting model that was used to generate these predictions."),
  predictions: z.object({
    '30day': PredictionPeriodSchema,
    '60day': PredictionPeriodSchema,
    '90day': PredictionPeriodSchema,
  }).describe('Demand predictions for 30, 60, and 90 day periods.'),
  modelExplanation: z.string().optional().describe("A brief explanation of how the chosen model influenced the forecast output and its suitability for the given data."),
  accuracyScore: z.number().min(0).max(100).optional().describe("An illustrative accuracy score (e.g., percentage) for the model's prediction on this data. For simulation purposes.")
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
  The user has selected the "{{{modelType}}}" forecasting model.
  Your task is to generate a demand forecast (30, 60, 90 days) that reflects the characteristics of this chosen model.
  For each prediction period, provide the demand, confidence level, an optional explanation, and an illustrative confidence interval (lower and upper bounds).
  Also, provide an overall 'modelExplanation' on how the chosen model was applied and an illustrative 'accuracyScore'.

  Historical Sales Data (JSON):
  \`\`\`json
  {{{historicalSalesData}}}
  \`\`\`

  Seasonality Factors/Market Conditions (if any):
  {{{seasonalityFactors}}}

  Model Descriptions (use these to guide your simulation):
  - SIMPLE_MOVING_AVERAGE: Best for stable products. Produces a smooth trend line. Assume high confidence for stable items.
  - EXPONENTIAL_SMOOTHING: Good for products with slight trends. Weights recent data more heavily. Adaptive trend following.
  - SEASONAL_DECOMPOSITION: Excellent for seasonal products. Identify base, seasonal, and trend components. Explain these if possible.
  - AI_PATTERN_RECOGNITION (Default): Use your advanced capabilities to analyze multiple factors, identify complex patterns, and anomalies. Confidence varies with data quality.
  - REGRESSION_ANALYSIS: Good for price-sensitive items or when external factors (promotions, weather - provide these in 'seasonalityFactors' if applicable) have strong correlations. Explain cause-effect if possible.
  - ENSEMBLE_COMBINED: Aims for maximum accuracy by notionally combining strengths of multiple models. Confidence is usually highest.

  Based on the historical data, seasonality factors, and the selected '{{{modelType}}}' model:
  1. Generate predictions for 30, 60, and 90 days.
  2. For each period, provide an illustrative 'lowerBound' and 'upperBound' for a confidence interval. This is for simulation.
  3. Provide an overall 'modelExplanation' detailing how the '{{{modelType}}}' influenced your forecast and its suitability.
  4. Provide an illustrative 'accuracyScore' (0-100) for the chosen model on this data.
  5. Ensure the 'modelUsed' field in the output matches '{{{modelType}}}'.

  Return the full forecast output.
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
    // Ensure modelUsed is set correctly, defaulting to input if somehow missing from LLM
    if (!output.modelUsed) {
        output.modelUsed = input.modelType;
    }
    return output;
  }
);

    