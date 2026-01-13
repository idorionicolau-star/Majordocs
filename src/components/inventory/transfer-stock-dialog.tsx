
"use client";

import { useState, useEffect, useMemo, useContext } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Truck } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from '@/hooks/use-toast';
import type { Product, Location } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { InventoryContext } from '@/context/inventory-context';

const formSchema = z.object({
  productName: z.string().nonempty({ message: "Por favor, selecione um produto." }),
  fromLocationId: z.string().nonempty({ message: "Por favor, selecione a localização de origem." }),
  toLocationId: z.string().nonempty({ message: "Por favor, selecione a localização de destino." }),
  quantity: z.coerce.number().min(1, { message: "A quantidade deve ser pelo menos 1." }),
}).refine(data => data.fromLocationId !== data.toLocationId, {
  message: "A localização de origem e destino não podem ser as mesmas.",
  path: ["toLocationId"],
});

type TransferFormValues = z.infer<typeof formSchema>;

interface TransferStockDialogProps {
    onTransfer: (productName: string, fromLocationId: string, toLocationId: string, quantity: number) => void;
}

export function TransferStockDialog({ onTransfer }: TransferStockDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { products, locations } = useContext(InventoryContext) || { products: [], locations: [] };
  
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: "",
      fromLocationId: "",
      toLocationId: "",
      quantity: 1,
    },
  });

  const watchedProductName = useWatch({ control: form.control, name: 'productName' });
  const watchedFromLocation = useWatch({ control: form.control, name: 'fromLocationId' });
  const watchedQuantity = useWatch({ control: form.control, name: 'quantity' });

  const uniqueProducts = useMemo(() => {
    if (!products) return [];
    const seen = new Set<string>();
    return products.filter(p => {
        if (seen.has(p.name)) {
            return false;
        }
        seen.add(p.name);
        return true;
    });
  }, [products]);

  const availableStock = useMemo(() => {
    if (!watchedProductName || !watchedFromLocation || !products) return 0;
    const productInstance = products.find(p => p.name === watchedProductName && p.location === watchedFromLocation);
    return productInstance ? productInstance.stock - productInstance.reservedStock : 0;
  }, [products, watchedProductName, watchedFromLocation]);

  useEffect(() => {
    if (watchedQuantity > availableStock) {
        form.setError("quantity", { type: "manual", message: `Stock insuficiente. Disponível: ${availableStock}` });
    } else {
        form.clearErrors("quantity");
    }
  }, [watchedQuantity, availableStock, form]);


  function onSubmit(values: TransferFormValues) {
    onTransfer(values.productName, values.fromLocationId, values.toLocationId, values.quantity);
    form.reset();
    setOpen(false);
  }

  if (!products || !locations) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="shadow-lg h-12 w-12 rounded-2xl">
                            <Truck className="h-5 w-5" />
                        </Button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Transferir Stock</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Stock entre Localizações</DialogTitle>
          <DialogDescription>
            Mova produtos de uma localização para outra.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="productName"
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
                      {uniqueProducts.map(product => (
                        <SelectItem key={product.name} value={product.name}>{product.name}</SelectItem>
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
                name="fromLocationId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>De</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Origem" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {locations.map(location => (
                            <SelectItem key={location.id} value={location.id}>
                            {location.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="toLocationId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Para</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Destino" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {locations.map(location => (
                            <SelectItem key={location.id} value={location.id}>
                            {location.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Quantidade</FormLabel>
                    {watchedProductName && watchedFromLocation && <p className="text-xs text-muted-foreground mt-1">Disponível: {availableStock}</p>}
                  </div>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={!form.formState.isValid}>Transferir</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
