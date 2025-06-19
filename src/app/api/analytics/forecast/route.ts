
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp, FieldValue } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import { forecastDemand, ForecastDemandInput, ForecastDemandOutput, ModelType } from '@/ai/flows/forecasting';
import type { SalesHistoryDocument, ForecastDocument } from '@/lib/types/firestore';
import { z } from 'zod';

const ModelTypeApiSchema = z.enum([
  "SIMPLE_MOVING_AVERAGE",
  "EXPONENTIAL_SMOOTHING",
  "SEASONAL_DECOMPOSITION",
  "AI_PATTERN_RECOGNITION",
  "REGRESSION_ANALYSIS",
  "ENSEMBLE_COMBINED"
]);

const ForecastRequestSchema = z.object({
  sku: z.string().min(1),
  // historicalSalesData is now fetched server-side
  seasonalityFactors: z.string().optional(),
  modelType: ModelTypeApiSchema.default("AI_PATTERN_RECOGNITION"),
  // Add other relevant inputs if needed, e.g., forecast horizon if not fixed in the flow
});

export async function POST(request: NextRequest) {
  let companyId: string, userId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
    userId = authResult.uid;
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validationResult = ForecastRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data.', details: validationResult.error.format() }, { status: 400 });
    }

    const { sku, seasonalityFactors, modelType } = validationResult.data;

    // Fetch historical sales data for the SKU from Firestore
    // Adjust period as needed, e.g., last 365 days
    const N_DAYS_HISTORY = 365;
    const historyEndDate = new Date();
    const historyStartDate = new Date();
    historyStartDate.setDate(historyEndDate.getDate() - N_DAYS_HISTORY);

    const salesHistorySnapshot = await db.collection('sales_history')
                                         .where('companyId', '==', companyId)
                                         .where('sku', '==', sku)
                                         .where('date', '>=', AdminTimestamp.fromDate(historyStartDate))
                                         .where('date', '<=', AdminTimestamp.fromDate(historyEndDate))
                                         .orderBy('date', 'asc')
                                         .get();

    const historicalSalesDataFormatted = salesHistorySnapshot.docs.map(doc => {
      const sale = doc.data() as SalesHistoryDocument;
      return {
        date: (sale.date as AdminTimestamp).toDate().toISOString().split('T')[0], // YYYY-MM-DD
        quantitySold: sale.quantity,
      };
    });

    if (historicalSalesDataFormatted.length === 0) {
      return NextResponse.json({ error: `No sales history found for SKU ${sku} in the last ${N_DAYS_HISTORY} days.` }, { status: 404 });
    }

    const forecastInput: ForecastDemandInput = {
      sku,
      historicalSalesData: JSON.stringify(historicalSalesDataFormatted),
      seasonalityFactors,
      modelType: modelType as ModelType,
    };

    const predictions: ForecastDemandOutput = await forecastDemand(forecastInput);

    // Store the forecast result in Firestore
    const forecastDocRef = db.collection('forecasts').doc(); // Auto-generate ID
    const forecastToStore: Omit<ForecastDocument, 'id'> = {
      companyId,
      productId: sku, // Assuming productId is the SKU for now
      sku,
      modelType: predictions.modelUsed,
      generatedAt: FieldValue.serverTimestamp() as AdminTimestamp,
      predictions: predictions.predictions, // This should match ForecastPredictionPeriod structure
      accuracy: predictions.accuracyScore,
      historicalDataUsedSummary: `Sales from ${historyStartDate.toISOString().split('T')[0]} to ${historyEndDate.toISOString().split('T')[0]} (${historicalSalesDataFormatted.length} data points)`,
      notes: seasonalityFactors ? `Seasonality: ${seasonalityFactors}` : undefined,
      createdBy: userId,
    };
    await forecastDocRef.set(forecastToStore);

    return NextResponse.json({ data: { ...predictions, forecastId: forecastDocRef.id } });
  } catch (error: any) {
    console.error('Error generating forecast:', error);
    const message = error.message || 'Failed to generate forecast.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
