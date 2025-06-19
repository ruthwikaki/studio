
"use client";

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getFirestore, collection, onSnapshot, query, where, Timestamp as ClientTimestamp } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase/client'; // Client Firebase app instance
import { useAuth } from './useAuth'; // Your existing auth hook
import { useToast } from './use-toast';
import type { InventoryStockDocument, OrderDocument, DocumentMetadata, NotificationDocument } from '@/lib/types/firestore';
import { INVENTORY_QUERY_KEY } from './useInventory'; // Assuming this key is exported

const db = getFirestore(firebaseApp);

export function useRealtimeUpdates() {
  const { user } = useAuth(); // Assumes useAuth gives you user object with uid and potentially companyId
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch companyId from user's custom claims or Firestore user document on client-side
  // This is a simplified example; in a real app, you'd get companyId securely.
  // For this example, let's assume `user.companyId` is available after auth.
  const companyId = (user as any)?.companyId || null; // Fallback for mock user

  useEffect(() => {
    if (!user || !companyId) {
      console.log("Realtime updates: User not authenticated or companyId missing.");
      return;
    }

    console.log(`Setting up realtime listeners for company: ${companyId}`);

    // --- Inventory Low Stock Alerts ---
    const inventoryQuery = query(
      collection(db, "inventory"),
      where("companyId", "==", companyId)
    );

    const unsubscribeInventory = onSnapshot(inventoryQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const item = { id: change.doc.id, ...change.doc.data() } as InventoryStockDocument;
        
        if (change.type === "modified" || change.type === "added") {
           // Update React Query cache for inventory list
          queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY, { filters: { companyId } }] });
           // More granular update:
          // queryClient.setQueryData([INVENTORY_QUERY_KEY, { filters: { companyId } }, item.id], item);


          if (item.quantity <= item.reorderPoint && !item.lowStockAlertSent) {
            toast({
              title: "Low Stock Alert!",
              description: `${item.name} (SKU: ${item.sku}) is running low. Current: ${item.quantity}, Reorder at: ${item.reorderPoint}.`,
              variant: "destructive",
              duration: 10000,
            });
            // In a real app, you'd also update `lowStockAlertSent` in Firestore
            // This might be done via a server action/API call to avoid race conditions
            // For example: markLowStockAlertSent(item.id);
          }
        }
        if (change.type === "removed") {
            queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY, { filters: { companyId } }] });
        }
      });
    }, (error) => {
        console.error("Error in inventory snapshot listener:", error);
    });

    // --- Order Status Changes ---
    // Example: Listen for orders that just got 'delivered'
    const ordersQuery = query(
      collection(db, "orders"),
      where("companyId", "==", companyId)
      // where("status", "==", "delivered") // More specific, or listen to all and check type
    );
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const order = { id: change.doc.id, ...change.doc.data() } as OrderDocument;
          // Check if the status was previously something else and now is 'delivered'
          const oldData = change.doc.metadata.hasPendingWrites ? null : change.doc.data({ serverTimestamps: 'previous' }); // Needs careful handling
          // For simplicity, we just toast if status is delivered
          if (order.status === 'delivered') {
             toast({
                title: "Order Delivered!",
                description: `Order ${order.orderNumber} has been delivered.`,
                variant: "default"
            });
          }
           // Invalidate relevant order queries
          queryClient.invalidateQueries({ queryKey: ['orders', { companyId }] }); // Example key
        }
      });
    }, (error) => {
        console.error("Error in orders snapshot listener:", error);
    });

    // --- Document Processing Status ---
    const documentsQuery = query(
        collection(db, "documents"),
        where("companyId", "==", companyId)
    );
    const unsubscribeDocuments = onSnapshot(documentsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
                const docMeta = { id: change.doc.id, ...change.doc.data() } as DocumentMetadata;
                if (docMeta.status === 'processed' || docMeta.status === 'approved') {
                    toast({
                        title: "Document Update",
                        description: `Document "${docMeta.fileName}" has been ${docMeta.status}.`,
                        variant: "default"
                    });
                }
                queryClient.invalidateQueries({ queryKey: ['documentsList', { companyId }] }); // Example key
            }
        });
    }, (error) => {
        console.error("Error in documents snapshot listener:", error);
    });
    
    // --- New Notifications Listener ---
    const notificationsQuery = query(
        collection(db, "notifications"),
        where("companyId", "==", companyId),
        where("userId", "==", user.uid), // Listen only to notifications for the current user
        where("isRead", "==", false), // Only new/unread notifications
        where("createdAt", ">", ClientTimestamp.now()) // Listen for future notifications from now
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const notification = {id: change.doc.id, ...change.doc.data()} as NotificationDocument;
                toast({
                    title: notification.title || "New Notification",
                    description: notification.message,
                    duration: 15000,
                    action: notification.linkTo ? <a href={notification.linkTo} className="underline">View</a> : undefined,
                });
                queryClient.invalidateQueries({ queryKey: ['notifications', user.uid]});
            }
        });
    }, (error) => {
        console.error("Error in notifications snapshot listener:", error);
    });


    return () => {
      console.log("Cleaning up realtime listeners.");
      unsubscribeInventory();
      unsubscribeOrders();
      unsubscribeDocuments();
      unsubscribeNotifications();
    };
  }, [user, companyId, queryClient, toast]);

  // This hook doesn't return data directly; it updates caches and shows toasts.
}
