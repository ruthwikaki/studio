
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

const InventoryChatInputSchema = z.object({
  query: z.string().describe('The natural language query about inventory data.'),
  inventoryData: z.string().describe('The inventory data as a JSON string. This data is typically loaded from Firestore or a parsed file before calling the flow.'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('The conversation history to maintain context.'),
});
export type InventoryChatInput = z.infer<typeof InventoryChatInputSchema>;

const InventoryChatOutputSchema = z.object({
  response: z.string().describe('The AI-powered textual response to the inventory query.'),
  actionableInsights: z.array(z.string()).optional().describe('A list of actionable insights derived from the query and data, if applicable.'),
});
export type InventoryChatOutput = z.infer<typeof InventoryChatOutputSchema>;

export async function inventoryChat(input: InventoryChatInput): Promise<InventoryChatOutput> {
  return inventoryChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'inventoryChatPrompt',
  input: {schema: InventoryChatInputSchema},
  output: {schema: InventoryChatOutputSchema},
  prompt: `You are SupplyChainAI, an expert AI assistant specializing in providing insights about inventory data.
  You will be provided with inventory data in JSON format and a natural language query from the user.
  Your goal is to answer the user's query based on the provided inventory data and conversation history.
  Answer questions related to:
  - Items running low or needing reordering.
  - Dead stock identification.
  - Product turnover analysis.
  - Recommendations for what to reorder.
  - General queries about product quantities, values, or categories.

  Provide a direct textual response. If applicable, also provide a list of actionable insights.

  Inventory Data:
  \`\`\`${'json'}
  {{{inventoryData}}}
  \`\`\`

  Conversation History:
  {{#each conversationHistory}}
  {{#ifEquals role "user"}}User: {{content}}{{/ifEquals}}
  {{#ifEquals role "assistant"}}Assistant: {{content}}{{/ifEquals}}
  {{/each}}

  User Query: {{{query}}}

  Please provide your analysis.
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

const inventoryChatFlow = ai.defineFlow(
  {
    name: 'inventoryChatFlow',
    inputSchema: InventoryChatInputSchema,
    outputSchema: InventoryChatOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate a response for the inventory chat.");
    }
    return output;
  }
);
