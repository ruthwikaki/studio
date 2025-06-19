
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp, FieldValue } from '@/lib/firebase/admin';
import { verifyAuthToken, withAuth, VerifiedUser } from '@/lib/firebase/admin-auth';
import { forecastDemand, ForecastDemandInput, ForecastDemandOutput, ModelType } from '@/ai/flows/forecasting';
import type { SalesHistoryDocument, ForecastDocument, JobQueueDocument, GenerateForecastJobPayload } from '@/lib/types/firestore';
import { z } from 'zod';
import { logActivity } from '@/lib/activityLog';

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
  seasonalityFactors: z.string().optional(),
  modelType: ModelTypeApiSchema.default("AI_PATTERN_RECOGNITION"),
});

// This endpoint will now create a job for forecast generation
export const POST = withAuth(async (request: NextRequest, context: { params: any }, user: VerifiedUser) => {
  const { companyId, uid: userId } = user;

  try {
    const body = await request.json();
    const validationResult = ForecastRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data.', details: validationResult.error.format() }, { status: 400 });
    }

    const { sku, seasonalityFactors, modelType } = validationResult.data;

    // Create a job in the job_queue collection
    const jobRef = db.collection('job_queue').doc();
    const jobPayload: GenerateForecastJobPayload = { sku, seasonalityFactors, modelType: modelType as ModelType };
    
    const newJob: Omit<JobQueueDocument<GenerateForecastJobPayload>, 'id'> = {
      companyId,
      userId,
      jobType: 'generate_forecast',
      payload: jobPayload,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp() as AdminTimestamp,
      updatedAt: FieldValue.serverTimestamp() as AdminTimestamp,
      maxRetries: 3, // Example: allow up to 3 retries
    };

    await jobRef.set(newJob);

    await logActivity({
      user,
      actionType: 'forecast_requested',
      resourceType: 'forecast',
      resourceId: jobRef.id, // Log job ID as resourceId
      description: `Forecast generation requested for SKU ${sku} via job ${jobRef.id}.`,
      details: { sku, modelType, jobId: jobRef.id }
    });
    
    // Note: Actual forecast generation and saving to 'forecasts' collection
    // would be handled by a background worker (e.g., Cloud Function)
    // listening to the 'job_queue'.

    return NextResponse.json({ 
        message: `Forecast generation for SKU ${sku} has been queued.`,
        jobId: jobRef.id 
    }, { status: 202 }); // 202 Accepted: Request accepted for processing

  } catch (error: any) {
    console.error('Error queuing forecast generation:', error);
    const message = error.message || 'Failed to queue forecast generation.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
