// Implemented Genkit flow for AI-powered chat interface for natural language inventory queries.
'use server';

/**
 * @fileOverview An AI-powered chat interface for answering questions about inventory data.
 *
 * - inventoryInsightsChat - A function that handles the inventory insights chat process.
 * - InventoryInsightsChatInput - The input type for the inventoryInsightsChat function.
 * - InventoryInsightsChatOutput - The return type for the inventoryInsightsChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InventoryInsightsChatInputSchema = z.object({
  query: z.string().describe('The natural language query about inventory data.'),
  inventoryData: z.string().describe('The inventory data as a JSON string.'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('The conversation history.'),
});
export type InventoryInsightsChatInput = z.infer<typeof InventoryInsightsChatInputSchema>;

const InventoryInsightsChatOutputSchema = z.object({
  response: z.string().describe('The AI-powered response to the inventory query.'),
});
export type InventoryInsightsChatOutput = z.infer<typeof InventoryInsightsChatOutputSchema>;

export async function inventoryInsightsChat(input: InventoryInsightsChatInput): Promise<InventoryInsightsChatOutput> {
  return inventoryInsightsChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'inventoryInsightsChatPrompt',
  input: {schema: InventoryInsightsChatInputSchema},
  output: {schema: InventoryInsightsChatOutputSchema},
  prompt: `You are a helpful AI assistant specialized in providing insights about inventory data.

  You will be provided with inventory data in JSON format and a natural language query from the user.
  Your goal is to answer the user's query based on the provided inventory data.
  Maintain the conversation history to provide context-aware responses.

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

  Response:`, // MUST be called Response
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const inventoryInsightsChatFlow = ai.defineFlow(
  {
    name: 'inventoryInsightsChatFlow',
    inputSchema: InventoryInsightsChatInputSchema,
    outputSchema: InventoryInsightsChatOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

