
'use server';
/**
 * @fileOverview A Genkit flow for optimizing reorder points and quantities.
 *
 * - optimizeReorders - A function that generates reorder recommendations.
 * - OptimizeReordersInput - The input type for the optimizeReorders function.
 * - OptimizeReordersOutput - The return type for the optimizeReorders function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeReordersInputSchema = z.object({
  currentInventory: z.string().describe('JSON string of current inventory levels. Example: [{"sku": "SKU001", "name": "Product A", "quantity": 50, "unitCost": 10, "currentReorderPoint": 20}, ...]'),
  historicalDemand: z.string().describe('JSON string of historical demand data for relevant SKUs. Example: [{"sku": "SKU001", "salesHistory": [{"date": "YYYY-MM-DD", "quantitySold": 5}, ...]}, ...]'),
  supplierLeadTimes: z.string().describe('JSON string of supplier lead times. Example: [{"sku": "SKU001", "supplierId": "SUP01", "leadTimeDays": 14}, ...]'),
  bulkDiscountThresholds: z.string().optional().describe('JSON string detailing bulk discount thresholds from suppliers. Example: [{"supplierId": "SUP01", "sku": "SKU001", "thresholds": [{"minQuantity": 100, "discountPercentage": 5}, {"minQuantity": 200, "discountPercentage": 10}]}]'),
  cashFlowConstraints: z.string().optional().describe('Textual description of any cash flow constraints or budget limitations for reordering.'),
});
export type OptimizeReordersInput = z.infer<typeof OptimizeReordersInputSchema>;

const OptimizeReordersOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      sku: z.string().describe('The SKU of the product to reorder.'),
      productName: z.string().describe('The name of the product.'),
      currentQuantity: z.number().describe('Current quantity in stock.'),
      currentReorderPoint: z.number().describe('Current reorder point for the SKU.'),
      optimizedReorderPoint: z.number().describe('The calculated optimal reorder point.'),
      optimalReorderQuantity: z.number().describe('The calculated optimal quantity to reorder.'),
      selectedSupplierId: z.string().optional().describe('Recommended supplier ID if applicable.'),
      estimatedCost: z.number().describe('Estimated cost for this reorder quantity.'),
      notes: z.string().optional().describe('Any notes or reasons for the recommendation, e.g., "Considers bulk discount X".'),
    })
  ).describe('A list of purchase order recommendations.'),
});
export type OptimizeReordersOutput = z.infer<typeof OptimizeReordersOutputSchema>;

export async function optimizeReorders(input: OptimizeReordersInput): Promise<OptimizeReordersOutput> {
  return optimizeReordersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeReordersPrompt',
  input: {schema: OptimizeReordersInputSchema},
  output: {schema: OptimizeReordersOutputSchema},
  prompt: `You are SupplyChainAI, an expert in inventory reorder optimization.
  Analyze the provided data: current inventory levels, historical demand, supplier lead times, bulk discount thresholds (if any), and cash flow constraints (if any).
  Your goal is to calculate optimal reorder points and quantities for each relevant SKU to minimize stockouts and holding costs, while considering potential discounts and financial constraints.
  Generate concrete purchase order recommendations.

  Current Inventory (JSON):
  \`\`\`${'json'}
  {{{currentInventory}}}
  \`\`\`

  Historical Demand (JSON):
  \`\`\`${'json'}
  {{{historicalDemand}}}
  \`\`\`

  Supplier Lead Times (JSON):
  \`\`\`${'json'}
  {{{supplierLeadTimes}}}
  \`\`\`

  Bulk Discount Thresholds (JSON, optional):
  \`\`\`${'json'}
  {{{bulkDiscountThresholds}}}
  \`\`\`

  Cash Flow Constraints (Text, optional):
  {{{cashFlowConstraints}}}

  Provide your reorder optimization recommendations. For each recommendation, include SKU, product name, current quantity, current reorder point, the optimized reorder point, the optimal reorder quantity, estimated cost, and any relevant notes.
  If supplier choice is relevant for discounts, indicate the selected supplier.
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

const optimizeReordersFlow = ai.defineFlow(
  {
    name: 'optimizeReordersFlow',
    inputSchema: OptimizeReordersInputSchema,
    outputSchema: OptimizeReordersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate reorder optimization recommendations.");
    }
    return output;
  }
);
