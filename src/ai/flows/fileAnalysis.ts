
'use server';
/**
 * @fileOverview A Genkit flow for analyzing parsed inventory data (from CSV/Excel) to generate insights.
 *
 * - analyzeInventoryFile - A function that analyzes inventory data and returns a structured report.
 * - AnalyzeInventoryFileInput - The input type for the analyzeInventoryFile function.
 * - AnalyzeInventoryFileOutput - The return type for the analyzeInventoryFile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeInventoryFileInputSchema = z.object({
  parsedInventoryData: z.string().describe('Parsed inventory data from a CSV or Excel file, provided as a JSON string. Example: [{"sku": "SKU001", "name": "Product A", "quantity": 100, "unitCost": 10, "salesVelocity": 5}, ...]'),
});
export type AnalyzeInventoryFileInput = z.infer<typeof AnalyzeInventoryFileInputSchema>;

const AnalyzeInventoryFileOutputSchema = z.object({
  report: z.object({
    healthScore: z.number().min(0).max(100).describe('An overall inventory health score from 0 to 100.'),
    opportunities: z.array(z.string()).describe('List of top opportunities, e.g., "Liquidate overstocked SKU002 (X units, Y value)".'),
    riskAlerts: z.array(z.string()).describe('List of critical risk alerts, e.g., "SKU005 is about to stock out (Z units left, potential lost sales)".'),
    abcCategorization: z.record(z.string(), z.array(z.string())).describe('ABC categorization of inventory items. Key: Category (A, B, C). Value: Array of SKUs. e.g., {"A": ["SKU001", "SKU004"], "B": ["SKU002"], "C": ["SKU003"]}'),
    suggestedActions: z.array(z.string()).describe('A list of specific, actionable suggestions based on the analysis.'),
  }).describe('A comprehensive report on the analyzed inventory data.'),
});
export type AnalyzeInventoryFileOutput = z.infer<typeof AnalyzeInventoryFileOutputSchema>;

export async function analyzeInventoryFile(input: AnalyzeInventoryFileInput): Promise<AnalyzeInventoryFileOutput> {
  return analyzeInventoryFileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeInventoryFilePrompt',
  input: {schema: AnalyzeInventoryFileInputSchema},
  output: {schema: AnalyzeInventoryFileOutputSchema},
  prompt: `You are ARIA, an expert inventory analyst.
  You have been provided with parsed inventory data (originally from a CSV/Excel file) in JSON format.
  Your task is to analyze this data thoroughly and generate a structured report containing:
  1.  **Inventory Health Score**: An overall score from 0 to 100 reflecting the health of the inventory.
  2.  **Top Opportunities**: Identify key opportunities, such as overstocked items to liquidate, or items with high demand and good margins.
  3.  **Risk Alerts**: Highlight critical risks, like items about to stock out, or items with very low turnover (dead stock).
  4.  **ABC Categorization**: Categorize items into A, B, and C groups based on their value, sales volume, or other relevant criteria.
  5.  **Suggested Actions**: Provide a list of specific, actionable suggestions based on your analysis.

  Parsed Inventory Data (JSON):
  \`\`\`${'json'}
  {{{parsedInventoryData}}}
  \`\`\`

  Please generate the full analysis report.
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

const analyzeInventoryFileFlow = ai.defineFlow(
  {
    name: 'analyzeInventoryFileFlow',
    inputSchema: AnalyzeInventoryFileInputSchema,
    outputSchema: AnalyzeInventoryFileOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate an inventory file analysis report.");
    }
    return output;
  }
);
