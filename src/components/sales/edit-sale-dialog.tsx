
"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Product, Sale } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const formSchema = z.object({
  productId: z.string().nonempty({ message: "Por favor, selecione um produto." }),
  quantity: z.coerce.number().min(1, { message: "A quantidade deve ser pelo menos 1." }),
  unitPrice: z.coerce.number().min(0, { message: "O preço não pode ser negativo." }),
});

type EditSaleFormValues = z.infer<typeof formSchema>;

interface EditSaleDialogProps {
    sale: Sale;
    products: Product[];
    onUpdateSale: (sale: Sale) => void;
    children: React.ReactNode;
}

export function EditSaleDialog({ sale, products, onUpdateSale, children }: EditSaleDialogProps) {
  const [open, setOpen] = useState(false);
  
  const form = useForm<EditSaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: sale.productId,
      quantity: sale.quantity,
      unitPrice: sale.unitPrice,
    },
  });
  
  const watchedProductId = useWatch({ control: form.control, name: 'productId' });
  const watchedQuantity = useWatch({ control: form.control, name: 'quantity' });
  const watchedUnitPrice = useWatch({ control: form.control, name: 'unitPrice' });

  const selectedProduct = products.find(p => p.id === watchedProductId);

  // This effect updates the price only when the product changes,
  // but allows manual override.
  useEffect(() => {
    if (selectedProduct) {
        // Only update unit price if it's still the default from the original product
        if (form.getValues('unitPrice') === (products.find(p => p.id === sale.productId)?.price || 0)) {
            form.setValue('unitPrice', selectedProduct.price);
        }
    }
  }, [selectedProduct, form, sale.productId, products]);

  useEffect(() => {
    if (open) {
      form.reset({
        productId: sale.productId,
        quantity: sale.quantity,
        unitPrice: sale.unitPrice,
      });
    }
  }, [open, sale, form]);

  const totalValue = (watchedUnitPrice || 0) * (watchedQuantity || 0);

  function onSubmit(values: EditSaleFormValues) {
    const product = products.find(p => p.id === values.productId);
    if (!product) return;

    onUpdateSale({
      ...sale,
      ...values,
      productName: product.name,
      totalValue: values.quantity * values.unitPrice,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Venda #{sale.guideNumber}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                        <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                    control={form.control}
                    name="unitPrice"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Preço Unitário</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <div className="rounded-lg bg-muted p-4 text-right">
                <p className="text-sm font-medium text-muted-foreground">Novo Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            </div>

            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
