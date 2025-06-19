
"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateInventoryItem, useUpdateInventoryItem, CreateInventoryItemInput, CreateInventoryItemSchema, UpdateInventoryItemInput } from '@/hooks/useInventory';
import type { InventoryStockDocument } from '@/lib/types/firestore';
import { Loader2 } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: InventoryStockDocument | null;
}

export function ProductFormModal({ isOpen, onClose, product }: ProductFormModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateInventoryItemInput>({
    resolver: zodResolver(CreateInventoryItemSchema),
    defaultValues: product || {
      sku: '',
      name: '',
      quantity: 0,
      unitCost: 0,
      reorderPoint: 0,
      category: '',
      description: '',
      reorderQuantity: 0,
      location: '',
      imageUrl: ''
    },
  });

  const createItemMutation = useCreateInventoryItem();
  const updateItemMutation = useUpdateInventoryItem();

  useEffect(() => {
    if (product) {
      reset(product);
    } else {
      reset({
        sku: '', name: '', quantity: 0, unitCost: 0, reorderPoint: 0,
        category: '', description: '', reorderQuantity: 0, location: '', imageUrl: ''
      });
    }
  }, [product, reset, isOpen]);

  const onSubmit = async (data: CreateInventoryItemInput) => {
    if (product) {
      await updateItemMutation.mutateAsync({ sku: product.sku, data: data as UpdateInventoryItemInput });
    } else {
      await createItemMutation.mutateAsync(data);
    }
    if (!createItemMutation.isError && !updateItemMutation.isError) {
       onClose();
    }
  };
  
  const isSubmitting = createItemMutation.isPending || updateItemMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {product ? 'Update the details for this product.' : 'Fill in the information for the new product.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 py-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register("sku")} placeholder="Unique Product SKU" className={errors.sku ? 'border-destructive' : ''} disabled={!!product}/>
              {errors.sku && <p className="text-xs text-destructive mt-1">{errors.sku.message}</p>}
            </div>
             <div>
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g., Premium T-Shirt" className={errors.name ? 'border-destructive' : ''} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" {...register("quantity")} placeholder="e.g., 100" className={errors.quantity ? 'border-destructive' : ''}/>
              {errors.quantity && <p className="text-xs text-destructive mt-1">{errors.quantity.message}</p>}
            </div>
            <div>
              <Label htmlFor="unitCost">Unit Cost ($)</Label>
              <Input id="unitCost" type="number" step="0.01" {...register("unitCost")} placeholder="e.g., 12.50" className={errors.unitCost ? 'border-destructive' : ''} />
              {errors.unitCost && <p className="text-xs text-destructive mt-1">{errors.unitCost.message}</p>}
            </div>
            <div>
              <Label htmlFor="reorderPoint">Reorder Point</Label>
              <Input id="reorderPoint" type="number" {...register("reorderPoint")} placeholder="e.g., 20" className={errors.reorderPoint ? 'border-destructive' : ''}/>
              {errors.reorderPoint && <p className="text-xs text-destructive mt-1">{errors.reorderPoint.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input id="category" {...register("category")} placeholder="e.g., Apparel"/>
            </div>
             <div>
              <Label htmlFor="reorderQuantity">Reorder Quantity</Label>
              <Input id="reorderQuantity" type="number" {...register("reorderQuantity")} placeholder="e.g., 50"/>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} placeholder="Brief description of the product."/>
          </div>
           <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register("location")} placeholder="e.g., Warehouse A, Shelf B2"/>
          </div>
           <div>
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input id="imageUrl" {...register("imageUrl")} placeholder="https://example.com/image.png"/>
             {errors.imageUrl && <p className="text-xs text-destructive mt-1">{errors.imageUrl.message}</p>}
          </div>

          <DialogFooter className="pt-4">
             <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? 'Save Changes' : 'Add Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
