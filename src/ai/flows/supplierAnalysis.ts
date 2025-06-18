
'use server';
/**
 * @fileOverview A Genkit flow for analyzing supplier performance and recommending best suppliers.
 *
 * - analyzeSuppliers - A function that evaluates suppliers and provides recommendations.
 * - AnalyzeSuppliersInput - The input type for the analyzeSuppliers function.
 * - AnalyzeSuppliersOutput - The return type for the analyzeSuppliers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeSuppliersInputSchema = z.object({
  supplierData: z.string().describe('JSON string of supplier details. Example: [{"id": "SUP01", "name": "Supplier Alpha", "pricing": [{"sku": "SKU001", "price": 9.50, "currency": "USD"}, {"sku": "SKU002", "price": 18.00}], "performanceMetrics": {"onTimeDeliveryRate": 0.95, "qualityRating": 4.5, "leadTimeDays": 10}}, ...]'),
  productRequirements: z.string().describe('JSON string detailing products needing sourcing and their requirements. Example: [{"sku": "SKU001", "requiredQuantity": 100, "targetPrice": 9.00, "qualityExpectation": "High"}, ...]'),
  orderHistory: z.string().optional().describe('JSON string of past order history with suppliers, if available. Example: [{"orderId": "ORD123", "supplierId": "SUP01", "sku": "SKU001", "quantity": 50, "pricePaid": 9.75, "receivedDate": "YYYY-MM-DD"}]'),
});
export type AnalyzeSuppliersInput = z.infer<typeof AnalyzeSuppliersInputSchema>;

const AnalyzeSuppliersOutputSchema = z.object({
  analysis: z.object({
    bestSupplierPerProduct: z.array(
      z.object({
        sku: z.string().describe('The SKU of the product.'),
        productName: z.string().optional().describe('The name of the product (if available from inputs).'),
        recommendedSupplierId: z.string().describe('The ID of the recommended supplier.'),
        recommendedSupplierName: z.string().describe('The name of the recommended supplier.'),
        reason: z.string().describe('Explanation for why this supplier is recommended for this product (e.g., best price, reliability, quality).'),
        alternativeSuppliers: z.array(z.object({
          supplierId: z.string(),
          supplierName: z.string(),
          reasonForNotRecommending: z.string().optional(),
        })).optional().describe('List of alternative suppliers considered and why they were not the primary recommendation.'),
      })
    ).describe('Recommendations for the best supplier for each required product.'),
    consolidationOpportunities: z.array(z.string()).describe('Suggestions for consolidating orders across suppliers to potentially achieve better pricing or logistics.'),
    supplierPerformanceSummary: z.array(z.object({
        supplierId: z.string(),
        supplierName: z.string(),
        overallRating: z.string().describe("A qualitative overall rating like 'Excellent', 'Good', 'Fair', 'Poor'."),
        keyStrengths: z.array(z.string()).optional(),
        keyWeaknesses: z.array(z.string()).optional(),
    })).optional().describe('A summary of each supplier\'s performance evaluation.'),
  }).describe('A comprehensive supplier analysis report.'),
});
export type AnalyzeSuppliersOutput = z.infer<typeof AnalyzeSuppliersOutputSchema>;

export async function analyzeSuppliers(input: AnalyzeSuppliersInput): Promise<AnalyzeSuppliersOutput> {
  return analyzeSuppliersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSuppliersPrompt',
  input: {schema: AnalyzeSuppliersInputSchema},
  output: {schema: AnalyzeSuppliersOutputSchema},
  prompt: `You are SupplyChainAI, an expert in supplier relationship management and procurement analysis.
  You have been provided with supplier data, product requirements, and optionally, order history.
  Your tasks are to:
  1.  **Evaluate Supplier Performance**: Based on metrics like pricing, lead times, on-time delivery, quality ratings from the provided data.
  2.  **Recommend Best Supplier per Product**: For each product in the requirements, recommend the best supplier. Consider price, reliability, quality, and lead time. Provide a reason for each recommendation.
  3.  **Identify Order Consolidation Opportunities**: Suggest ways to consolidate orders if it could lead to benefits like bulk discounts or simplified logistics.
  4.  **Summarize Supplier Performance**: Provide an overall rating and key strengths/weaknesses for suppliers if possible from the data.

  Supplier Data (JSON):
  \`\`\`${'json'}
  {{{supplierData}}}
  \`\`\`

  Product Requirements (JSON):
  \`\`\`${'json'}
  {{{productRequirements}}}
  \`\`\`

  Order History (JSON, optional):
  \`\`\`${'json'}
  {{{orderHistory}}}
  \`\`\`

  Please generate a comprehensive supplier analysis report.
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

const analyzeSuppliersFlow = ai.defineFlow(
  {
    name: 'analyzeSuppliersFlow',
    inputSchema: AnalyzeSuppliersInputSchema,
    outputSchema: AnalyzeSuppliersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate a supplier analysis report.");
    }
    return output;
  }
);
