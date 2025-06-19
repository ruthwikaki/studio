
// src/lib/activityLog.ts
import { db, AdminTimestamp } from '@/lib/firebase/admin';
import type { ActivityLogDocument, ActivityActionType } from '@/lib/types/firestore';
import type { VerifiedUser } from '@/lib/firebase/admin-auth'; // Assuming VerifiedUser includes uid, companyId, email

interface LogActivityOptions {
  user: VerifiedUser;
  actionType: ActivityActionType;
  resourceType?: ActivityLogDocument['resourceType'];
  resourceId?: string;
  description?: string; // Auto-generated if not provided for some actions
  details?: Record<string, any>;
  ipAddress?: string; // Optional, may not always be available
}

function generateDescription(actionType: ActivityActionType, resourceType?: string, resourceId?: string, details?: any): string {
    // Basic description generator, can be expanded
    let desc = `User performed ${actionType.replace(/_/g, ' ')}`;
    if (resourceType) desc += ` on ${resourceType}`;
    if (resourceId) desc += ` ${resourceId}`;
    // e.g., for item_updated: "Updated quantity for SKU001 to 50 units"
    if (actionType === 'item_updated' && details?.sku && details?.updatedFields?.quantity !== undefined) {
        return `Updated quantity for ${details.sku} to ${details.updatedFields.quantity}.`;
    }
    if (actionType === 'order_created' && details?.orderNumber) {
        return `Created order ${details.orderNumber}.`;
    }
    return desc;
}


export async function logActivity(options: LogActivityOptions): Promise<void> {
  const { user, actionType, resourceType, resourceId, details, ipAddress } = options;
  
  const description = options.description || generateDescription(actionType, resourceType, resourceId, details);

  const logEntry: Omit<ActivityLogDocument, 'id'> = {
    companyId: user.companyId,
    userId: user.uid,
    userEmail: user.email || undefined,
    actionType,
    description,
    resourceType,
    resourceId,
    details,
    ipAddress, // Note: Reliably getting IP in Next.js API routes can be tricky (depends on deployment)
    timestamp: AdminTimestamp.now(),
  };

  try {
    await db.collection('activity_logs').add(logEntry);
    console.log(`Activity logged: ${actionType} by ${user.uid} for company ${user.companyId}`);
  } catch (error) {
    console.error('Error logging activity:', error);
    // Decide if this error should be propagated or just logged
  }
}
