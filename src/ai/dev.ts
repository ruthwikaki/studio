
import { config } from 'dotenv';
config();

// Import your Genkit flows here
import '@/ai/flows/inventoryChat.ts';
import '@/ai/flows/forecasting.ts';
import '@/ai/flows/fileAnalysis.ts';
import '@/ai/flows/reorderOptimization.ts';
import '@/ai/flows/supplierAnalysis.ts';
