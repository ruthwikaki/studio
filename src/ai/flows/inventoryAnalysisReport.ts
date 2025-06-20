
'use server';
/**
 * @fileOverview Genkit flow for generating a comprehensive inventory analysis report.
 *
 * - generateInventoryAnalysisReport - Function to analyze inventory and create a structured report.
 * - InventoryAnalysisReportInput - Input schema for the flow.
 * - InventoryAnalysisReportOutput - Output schema for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InventoryAnalysisReportInputSchema = z.object({
  inventoryData: z.string().describe('JSON string of current inventory stock. Example: [{"sku": "SKU001", "name": "Product A", "quantity": 50, "unitCost": 10, "reorderPoint": 20, "category": "Electronics", "salesHistory": [{"date": "YYYY-MM-DD", "quantitySold": 5}, ...]}, ...] Note: Sales history per item is crucial for dead stock and turnover analysis.'),
  // companyId: z.string().describe("The ID of the company for which to generate the report. This implies the AI might need to simulate data fetching if inventoryData is minimal."),
  // Optional: Add other contextual data like overall business goals or recent market events.
});
export type InventoryAnalysisReportInput = z.infer<typeof InventoryAnalysisReportInputSchema>;

const DeadStockItemSchema = z.object({
  sku: z.string(),
  name: z.string(),
  quantity: z.number(),
  unitCost: z.number(),
  value: z.number().describe("Total value of dead stock for this SKU (quantity * unitCost)."),
  daysSinceLastSale: z.number().optional().describe("Approximate number of days since the last recorded sale."),
  suggestion: z.string().optional().describe("e.g., Consider discount, bundle, or liquidate."),
});

const OverstockItemSchema = z.object({
  sku: z.string(),
  name: z.string(),
  quantity: z.number(),
  reorderPoint: z.number(),
  overstockQuantity: z.number().describe("Quantity exceeding typical needs (e.g., 2-3x reorder point or X months of supply)."),
  overstockValue: z.number(),
  suggestion: z.string().optional().describe("e.g., Pause reorders, promote item."),
});

const ReorderRecommendationSchema = z.object({
  sku: z.string(),
  name: z.string(),
  currentQuantity: z.number(),
  reorderPoint: z.number(),
  suggestedReorderQuantity: z.number(),
  reason: z.string().optional().describe("e.g., Low stock, high sales velocity."),
});

const SupplierPerformanceSummarySchema = z.object({
  supplierId: z.string().optional(), // May not always be available directly in inventory data
  supplierName: z.string(), // May need to be inferred or generalized if ID not present
  keyObservations: z.array(z.string()).describe("e.g., 'High concentration of critical items from Supplier X', 'Potential risk if Supplier Y has delays'."),
  overallRating: z.enum(["Good", "Fair", "Needs Attention"]).optional(),
});

const InventoryAnalysisReportOutputSchema = z.object({
  reportDate: z.string().describe("Date the report was generated (YYYY-MM-DD)."),
  overallHealthScore: z.number().min(0).max(100).describe("An overall inventory health score (0-100)."),
  keyFindingsSummary: z.array(z.string()).describe("Bulleted list of the most critical findings and recommendations."),
  deadStockAnalysis: z.object({
    totalDeadStockValue: z.number(),
    items: z.array(DeadStockItemSchema),
    summary: z.string().describe("Brief summary of dead stock situation."),
  }).optional(),
  overstockAnalysis: z.object({
    totalOverstockValue: z.number(),
    items: z.array(OverstockItemSchema),
    summary: z.string().describe("Brief summary of overstock situation."),
  }).optional(),
  reorderNeeds: z.object({
    urgentItems: z.array(ReorderRecommendationSchema).describe("Items needing immediate reorder."),
    upcomingItems: z.array(ReorderRecommendationSchema).describe("Items approaching reorder point soon."),
    summary: z.string().describe("Brief summary of reordering needs."),
  }).optional(),
  // Supplier insights may be limited if supplier details are not in inventoryData
  supplierInsights: z.object({ 
    items: z.array(SupplierPerformanceSummarySchema),
    summary: z.string().describe("Brief summary of supplier-related insights based on inventory concentration or risk.")
  }).optional(),
  additionalRecommendations: z.array(z.string()).optional().describe("General recommendations for inventory optimization."),
});
export type InventoryAnalysisReportOutput = z.infer<typeof InventoryAnalysisReportOutputSchema>;


export async function generateInventoryAnalysisReport(input: InventoryAnalysisReportInput): Promise<InventoryAnalysisReportOutput> {
  return generateInventoryAnalysisReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInventoryAnalysisReportPrompt',
  input: {schema: InventoryAnalysisReportInputSchema},
  output: {schema: InventoryAnalysisReportOutputSchema},
  prompt: `You are ARIA, an expert inventory analyst.
  You have been provided with inventory data in JSON format. This data may include SKU, name, quantity, unit cost, reorder point, category, and potentially sales history for each item.
  Your task is to perform a comprehensive analysis and generate a structured report with the following sections:

  1.  **Report Date**: Today's date (YYYY-MM-DD).
  2.  **Overall Inventory Health Score**: A score from 0-100. Consider factors like stock turnover (if inferable from sales history), stockout rates (items at or below 0 quantity vs total items), overstock levels, and dead stock percentage.
  3.  **Key Findings Summary**: A bulleted list of 3-5 most critical findings and actionable recommendations from your analysis.
  4.  **Dead Stock Analysis**:
      *   Identify items with no sales in the last 90-180 days (assume sales history per item is present or can be inferred).
      *   Calculate total dead stock value.
      *   List dead stock items with SKU, name, quantity, unitCost, value, and optionally daysSinceLastSale and a suggestion.
      *   Provide a summary.
  5.  **Overstock Analysis**:
      *   Identify items where quantity significantly exceeds typical needs (e.g., >2.5x reorder point, or >6 months of supply if sales velocity known).
      *   Calculate total overstock value.
      *   List overstocked items with SKU, name, quantity, reorderPoint, overstockQuantity, overstockValue, and a suggestion.
      *   Provide a summary.
  6.  **Reorder Needs**:
      *   Identify items currently at or below their reorder point (urgent).
      *   Identify items approaching reorder point (e.g., within 110% of reorder point).
      *   Suggest reorder quantities (e.g., based on reorderQuantity field if available, or a sensible default like 1-2 months of supply).
      *   Provide a summary.
  7.  **Supplier Insights** (If supplier information can be inferred or is part of item data):
      *   Comment on inventory concentration by supplier.
      *   Identify potential risks or opportunities related to suppliers.
      *   Provide a summary. If no supplier data, state that.
  8.  **Additional Recommendations**: General tips for inventory optimization based on the findings.

  Inventory Data (JSON):
  \`\`\`json
  {{{inventoryData}}}
  \`\`\`

  Please generate the full analysis report in the specified JSON output format.
  Focus on providing actionable insights. If sales history per item is not explicitly in the provided 'inventoryData', make reasonable assumptions or state that certain analyses (like dead stock) cannot be performed accurately.
  `,
  config: {
    temperature: 0.4, // Encourage more structured and analytical output
    safetySettings: [
      {category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH'},
      {category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE'},
      {category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE'},
      {category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE'},
    ],
  },
});

const generateInventoryAnalysisReportFlow = ai.defineFlow(
  {
    name: 'generateInventoryAnalysisReportFlow',
    inputSchema: InventoryAnalysisReportInputSchema,
    outputSchema: InventoryAnalysisReportOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      // Create a default error report structure
      return {
        reportDate: new Date().toISOString().split('T')[0],
        overallHealthScore: 10, // Low score indicating an issue
        keyFindingsSummary: ["AI model failed to generate a report. Input data might be insufficient or malformed."],
        // Other sections can be omitted or marked as error
      };
    }
    // Ensure reportDate is set, even if LLM omits it
    if (!output.reportDate) {
        output.reportDate = new Date().toISOString().split('T')[0];
    }
    return output;
  }
);
