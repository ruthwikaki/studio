
'use server';
/**
 * @fileOverview An AI-powered chat interface for answering questions about inventory data.
 *
 * - inventoryChat - A function that handles the inventory insights chat process.
 * - InventoryChatInput - The input type for the inventoryChat function.
 * - InventoryChatOutput - The return type for the inventoryChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatContextSchema = z.object({
  inventorySummary: z.object({
    totalItems: z.number(),
    totalValue: z.number(),
  }).optional().describe("Summary of overall inventory."),
  lowStockItems: z.array(z.object({ sku: z.string(), name: z.string(), quantity: z.number(), reorderPoint: z.number() })).optional().describe("List of items currently low in stock."),
  recentOrdersSummary: z.object({
    pendingPurchaseOrders: z.number(),
    awaitingDeliveryPurchaseOrders: z.number(),
  }).optional().describe("Summary of recent purchase orders."),
  topSuppliers: z.array(z.object({ id: z.string(), name: z.string(), reliabilityScore: z.number().optional() })).optional().describe("List of top or recent suppliers."),
  salesTrendsSummary: z.string().optional().describe("A brief textual summary of recent sales trends."),
  // Deprecated field: inventoryData: z.string().optional().describe('The inventory data as a JSON string. This data is typically loaded from Firestore or a parsed file before calling the flow.'),
});
export type ChatContext = z.infer<typeof ChatContextSchema>;


const InventoryChatInputSchema = z.object({
  query: z.string().describe('The natural language query about inventory data.'),
  chatContext: ChatContextSchema.optional().describe("Structured context about the inventory, suppliers, and orders."),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('The conversation history to maintain context.'),
});
export type InventoryChatInput = z.infer<typeof InventoryChatInputSchema>;

const InventoryChatOutputSchema = z.object({
  answer: z.string().describe('The AI-powered natural language textual response to the inventory query.'),
  data: z.record(z.string(), z.any()).optional().describe('Structured data related to the query, if applicable (e.g., a list of low stock items, supplier details, calculated values). The key indicates the type of data (e.g., "lowStockList", "inventoryValue").'),
  suggestedActions: z.array(z.string()).optional().describe('A list of actionable insights or next steps derived from the query and data, if applicable.'),
  confidence: z.number().min(0).max(1).optional().describe("AI's confidence in the answer (0.0 to 1.0).")
});
export type InventoryChatOutput = z.infer<typeof InventoryChatOutputSchema>;

export async function inventoryChat(input: InventoryChatInput): Promise<InventoryChatOutput> {
  return inventoryChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'inventoryChatPrompt',
  input: {schema: InventoryChatInputSchema},
  output: {schema: InventoryChatOutputSchema},
  prompt: `You are ARIA, an expert AI assistant specializing in providing insights about inventory, orders, and suppliers.
  You are provided with a 'chatContext' object containing summarized information and a user 'query'.
  Your goal is to answer the user's query based on the provided context and conversation history.

  Available Context ({{{jsonStringify chatContext}}}):
  - inventorySummary: Overall count and value of items.
  - lowStockItems: Specific items that are below their reorder points.
  - recentOrdersSummary: Counts of pending and awaiting delivery purchase orders.
  - topSuppliers: Information about key suppliers.
  - salesTrendsSummary: A high-level text summary of sales.

  Based on the user's query:
  1. Provide a concise, natural language 'answer'.
  2. If the query asks for specific data that can be listed (e.g., "Which items are low?"), provide that data in the 'data' field. The key for the 'data' field should be descriptive (e.g., "lowStockList", "supplierDetails", "inventoryValueCalculation").
  3. If applicable, suggest relevant 'suggestedActions' for the user.
  4. Provide a 'confidence' score (0.0 to 1.0) for your answer.

  Sophisticated Query Handling:
  - "What items haven't sold in X days?": State that you'd need to query sales history for items with no sales entries after a certain date.
  - "Which supplier is most reliable?": Use the 'topSuppliers' context. If it contains reliability scores, state the most reliable. If not, explain you need more detailed supplier performance data.
  - "What's my total inventory value?": Use 'inventorySummary.totalValue' from context if available. If not, state that you'd need to sum (quantity * unitCost) for all items.
  - "Show me dead stock": Explain you would identify items with no sales in the last 90-180 days (or a similar period).
  - "What are my best selling items?": Explain you'd need to aggregate sales data by SKU to find top revenue or quantity sold.
  - "Compare suppliers for [product SKU/name]": Explain you would need pricing, lead time, and reliability data for suppliers who offer that product.

  Conversation History:
  {{#each conversationHistory}}
  {{#ifEquals role "user"}}User: {{content}}{{/ifEquals}}
  {{#ifEquals role "assistant"}}Assistant: {{content}}{{/ifEquals}}
  {{/each}}

  User Query: {{{query}}}

  Please provide your analysis in the specified JSON output format.
  If the context is insufficient to fully answer, explain what additional data or analysis would be needed.
  `,
  config: {
    safetySettings: [
      {category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH'},
      {category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE'},
      {category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE'},
      {category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE'},
    ],
    temperature: 0.3, // Slightly lower for more factual responses
  },
});

const inventoryChatFlow = ai.defineFlow(
  {
    name: 'inventoryChatFlow',
    inputSchema: InventoryChatInputSchema,
    outputSchema: InventoryChatOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      // Fallback response if AI doesn't return structured output
      return {
        answer: "I encountered an issue processing your request. Please try rephrasing or ask a different question.",
        confidence: 0.1,
      };
    }
    // Ensure confidence is set, even if LLM omits it
    if (output.confidence === undefined) {
        output.confidence = 0.7; // Default confidence if not provided by LLM
    }
    return output;
  }
);

