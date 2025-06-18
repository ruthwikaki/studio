
"use client";

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateSupplier, useUpdateSupplier, CreateSupplierInput, UpdateSupplierInput } from '@/hooks/useSuppliers';
import type { SupplierDocument } from '@/lib/types/firestore';
import { Loader2 } from 'lucide-react';

// Zod schema for form validation (matches CreateSupplierInput from hook, but can be separate)
const supplierFormSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional().default({}),
  contactPerson: z.object({
    name: z.string().optional(),
    email: z.string().email("Invalid email address").optional().or(z.literal('')),
    phone: z.string().optional(),
  }).optional().default({}),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
  reliabilityScore: z.coerce.number().min(0).max(100).optional(),
  paymentTerms: z.string().optional(),
  moq: z.coerce.number().min(0).optional(),
  productsSuppliedSkus: z.string().optional().describe("Comma-separated SKUs"), // Simplified for now
  notes: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: SupplierDocument | null;
}

export function SupplierFormModal({ isOpen, onClose, supplier }: SupplierFormModalProps) {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: supplier ? {
        ...supplier,
        leadTimeDays: supplier.leadTimeDays ?? undefined,
        reliabilityScore: supplier.reliabilityScore ?? undefined,
        moq: supplier.moq ?? undefined,
        productsSuppliedSkus: supplier.productsSupplied?.map(p => p.sku).join(', ') || '',
        address: supplier.address || {},
        contactPerson: supplier.contactPerson || {},
    } : {
        address: {}, contactPerson: {}
    },
  });

  const createSupplierMutation = useCreateSupplier();
  const updateSupplierMutation = useUpdateSupplier();

  useEffect(() => {
    if (supplier) {
      reset({
        ...supplier,
        leadTimeDays: supplier.leadTimeDays ?? undefined,
        reliabilityScore: supplier.reliabilityScore ?? undefined,
        moq: supplier.moq ?? undefined,
        productsSuppliedSkus: supplier.productsSupplied?.map(p => p.sku).join(', ') || '',
        address: supplier.address || {},
        contactPerson: supplier.contactPerson || {},
      });
    } else {
      reset({
        name: '', email: '', phone: '', notes: '',
        leadTimeDays: undefined, reliabilityScore: undefined, moq: undefined,
        paymentTerms: '', productsSuppliedSkus: '',
        address: { street: '', city: '', state: '', zipCode: '', country: '' },
        contactPerson: { name: '', email: '', phone: '' },
      });
    }
  }, [supplier, reset, isOpen]);

  const onSubmit = async (data: SupplierFormData) => {
    const productsArray = data.productsSuppliedSkus?.split(',').map(s => s.trim()).filter(Boolean) || [];
    
    const payload: CreateSupplierInput | UpdateSupplierInput = {
      ...data,
      productsSuppliedSkus: productsArray,
    };

    if (supplier) {
      await updateSupplierMutation.mutateAsync({ id: supplier.id, data: payload as UpdateSupplierInput });
    } else {
      await createSupplierMutation.mutateAsync(payload as CreateSupplierInput);
    }
    if (!createSupplierMutation.isError && !updateSupplierMutation.isError) {
       onClose();
    }
  };
  
  const isSubmitting = createSupplierMutation.isPending || updateSupplierMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
          <DialogDescription>
            {supplier ? 'Update the details for this supplier.' : 'Fill in the information for the new supplier.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 py-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Supplier Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g., Global Electronics Ltd." className={errors.name ? 'border-destructive' : ''} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
             <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="e.g., sales@supplier.com" className={errors.email ? 'border-destructive' : ''} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} placeholder="e.g., (555) 123-4567" />
          </div>

          <fieldset className="grid gap-4 border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Address</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="address.street">Street</Label>
                    <Input id="address.street" {...register("address.street")} />
                </div>
                <div>
                    <Label htmlFor="address.city">City</Label>
                    <Input id="address.city" {...register("address.city")} />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label htmlFor="address.state">State/Province</Label>
                    <Input id="address.state" {...register("address.state")} />
                </div>
                <div>
                    <Label htmlFor="address.zipCode">Zip/Postal Code</Label>
                    <Input id="address.zipCode" {...register("address.zipCode")} />
                </div>
                <div>
                    <Label htmlFor="address.country">Country</Label>
                    <Input id="address.country" {...register("address.country")} />
                </div>
            </div>
          </fieldset>
           <fieldset className="grid gap-4 border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Contact Person</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                    <Label htmlFor="contactPerson.name">Name</Label>
                    <Input id="contactPerson.name" {...register("contactPerson.name")} />
                </div>
                <div>
                    <Label htmlFor="contactPerson.email">Email</Label>
                    <Input id="contactPerson.email" type="email" {...register("contactPerson.email")} className={errors.contactPerson?.email ? 'border-destructive' : ''} />
                     {errors.contactPerson?.email && <p className="text-xs text-destructive mt-1">{errors.contactPerson.email.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="contactPerson.phone">Phone</Label>
                    <Input id="contactPerson.phone" {...register("contactPerson.phone")} />
                </div>
            </div>
          </fieldset>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="leadTimeDays">Avg. Lead Time (Days)</Label>
              <Input id="leadTimeDays" type="number" {...register("leadTimeDays")} placeholder="e.g., 14" />
               {errors.leadTimeDays && <p className="text-xs text-destructive mt-1">{errors.leadTimeDays.message}</p>}
            </div>
            <div>
              <Label htmlFor="reliabilityScore">Reliability Score (0-100)</Label>
              <Input id="reliabilityScore" type="number" {...register("reliabilityScore")} placeholder="e.g., 85" />
              {errors.reliabilityScore && <p className="text-xs text-destructive mt-1">{errors.reliabilityScore.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input id="paymentTerms" {...register("paymentTerms")} placeholder="e.g., Net 30" />
            </div>
            <div>
              <Label htmlFor="moq">Minimum Order Quantity (General)</Label>
              <Input id="moq" type="number" {...register("moq")} placeholder="e.g., 100" />
              {errors.moq && <p className="text-xs text-destructive mt-1">{errors.moq.message}</p>}
            </div>
          </div>
          
          <div>
            <Label htmlFor="productsSuppliedSkus">Products Supplied (Comma-separated SKUs)</Label>
            <Textarea id="productsSuppliedSkus" {...register("productsSuppliedSkus")} placeholder="SKU001, SKU002, SKU005" />
            <p className="text-xs text-muted-foreground mt-1">Enter SKUs of products this supplier provides, separated by commas.</p>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Any special instructions or notes about this supplier." />
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {supplier ? 'Save Changes' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
