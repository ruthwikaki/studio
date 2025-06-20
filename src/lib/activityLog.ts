
// src/lib/activityLog.ts
import { getDb, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import type { ActivityLogDocument, ActivityActionType } from '@/lib/types/firestore';
import type { VerifiedUser } from '@/lib/firebase/admin-auth';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

interface LogActivityOptions {
  user: VerifiedUser;
  actionType: ActivityActionType;
  resourceType?: ActivityLogDocument['resourceType'];
  resourceId?: string;
  description?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

function generateDescription(actionType: ActivityActionType, resourceType?: string, resourceId?: string, details?: any): string {
    let desc = `User performed ${actionType.replace(/_/g, ' ')}`;
    if (resourceType) desc += ` on ${resourceType}`;
    if (resourceId) desc += ` ${resourceId}`;
    if (actionType === 'item_updated' && details?.sku && details?.updatedFields?.quantity !== undefined) {
        return `Updated quantity for ${details.sku} to ${details.updatedFields.quantity}.`;
    }
    if (actionType === 'order_created' && details?.orderNumber) {
        return `Created order ${details.orderNumber}.`;
    }
    return desc;
}


export async function logActivity(options: LogActivityOptions): Promise<void> {
  if (!isAdminInitialized()) {
    console.error("[Activity Log] Cannot log activity: Firebase Admin SDK not initialized.");
    return;
  }
  const db = getDb();
  if (!db) {
    console.error("[Activity Log] Cannot log activity: Firestore instance not available.");
    return;
  }

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
    ipAddress,
    timestamp: admin.firestore.Timestamp.now(),
  };

  try {
    await db.collection('activity_logs').add(logEntry);
    console.log(`Activity logged: ${actionType} by ${user.uid} for company ${user.companyId}`);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
