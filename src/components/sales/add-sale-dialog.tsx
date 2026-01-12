
"use client";

import { useState, useEffect, useContext } from 'react';
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
import { Plus, ShoppingCart } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from '@/hooks/use-toast';
import type { Product, Sale, Employee } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { CatalogProductSelector } from '../catalog/catalog-product-selector';
import { InventoryContext } from '@/context/inventory-context';
import { ScrollArea } from '../ui/scroll-area';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;

const formSchema = z.object({
  productName: z.string().nonempty({ message: "Por favor, selecione um produto." }),
  quantity: z.coerce.number().min(1, { message: "A quantidade deve ser pelo menos 1." }),
  unitPrice: z.coerce.number().min(0, { message: "O preço não pode ser negativo." }),
  location: z.string().optional(),
});

type AddSaleFormValues = z.infer<typeof formSchema>;

interface AddSaleDialogProps {
    onAddSale: (data: Omit<Sale, 'id' | 'guideNumber'>) => Promise<void>;
    triggerType?: 'button' | 'fab';
}

function AddSaleDialogContent({ onAddSale, triggerType = 'fab' }: AddSaleDialogProps) {
  const [open, setOpen] = useState(false);
  const inventoryContext = useContext(InventoryContext);
  const {
    products,
    catalogProducts,
    catalogCategories,
    locations,
    isMultiLocation,
    user,
  } = inventoryContext || { products: [], catalogProducts: [], catalogCategories: [], locations: [], isMultiLocation: false, user: null};
  const { toast } = useToast();
  
  const form = useForm<AddSaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: "",
      quantity: 1,
      unitPrice: 0,
      location: "",
    },
  });
  
  const watchedProductName = useWatch({ control: form.control, name: 'productName' });
  const watchedQuantity = useWatch({ control: form.control, name: 'quantity' });
  const watchedUnitPrice = useWatch({ control: form.control, name: 'unitPrice' });
  const watchedLocation = useWatch({ control: form.control, name: 'location' });

  const selectedProductInstance = products?.find(p => p.name === watchedProductName && (isMultiLocation ? p.location === watchedLocation : true));
  const availableStock = selectedProductInstance ? selectedProductInstance.stock - selectedProductInstance.reservedStock : 0;
  
  const handleProductSelect = (productName: string, product?: CatalogProduct) => {
    form.setValue('productName', productName);
    if (product) {
      form.setValue('unitPrice', product.price);
    } else {
      form.setValue('unitPrice', 0);
    }
  };


  useEffect(() => {
    if(selectedProductInstance){
      const stockIsSufficient = watchedQuantity <= availableStock;
      if (!stockIsSufficient) {
        form.setError("quantity", { type: "manual", message: `Estoque insuficiente. Disponível: ${availableStock}` });
      } else {
        form.clearErrors("quantity");
      }
    } else if (watchedProductName && isMultiLocation && watchedLocation) {
         form.setError("location", { type: "manual", message: `Produto sem estoque nesta localização.` });
    } else {
        form.clearErrors("location");
    }
  }, [watchedQuantity, availableStock, selectedProductInstance, watchedProductName, watchedLocation, isMultiLocation, form]);


  const totalValue = (watchedUnitPrice || 0) * (watchedQuantity || 0);

  useEffect(() => {
    if (locations && locations.length > 0 && !form.getValues('location')) {
        form.setValue('location', locations[0].id)
    }
  }, [locations, form]);


  async function onSubmit(values: AddSaleFormValues) {
    if (!selectedProductInstance || !user) {
        toast({
            variant: "destructive",
            title: "Erro de Validação",
            description: "Produto não encontrado ou utilizador não autenticado.",
        });
        return;
    }

    const newSale: Omit<Sale, 'id' | 'guideNumber'> = {
      date: new Date().toISOString(),
      productId: selectedProductInstance.id || '', // Should have an ID
      productName: selectedProductInstance.name,
      quantity: values.quantity,
      unitPrice: values.unitPrice,
      totalValue: values.quantity * values.unitPrice,
      soldBy: user.username,
      location: values.location,
      status: 'Pago',
    };
    
    await onAddSale(newSale);
    
    form.reset();
    if (locations && locations.length > 0) {
      form.setValue('location', locations[0].id);
    }
    setOpen(false);
  }
  
  const isSubmitDisabled = !form.formState.isValid || form.formState.isSubmitting;
  
  const TriggerComponent = triggerType === 'fab' ? (
     <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <DialogTrigger asChild>
                    <Button className="fixed bottom-6 right-4 sm:right-6 h-14 w-14 rounded-full shadow-2xl z-50">
                        <Plus className="h-6 w-6" />
                    </Button>
                </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="left">
                <p>Registrar Venda</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  ) : (
     <DialogTrigger asChild>
        <Button variant="outline">
            <ShoppingCart className="mr-2 h-4 w-4" />+ Vendas
        </Button>
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {TriggerComponent}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Nova Venda</DialogTitle>
          <DialogDescription>
            A venda será marcada como 'Paga' e o stock ficará reservado.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] -mr-3 pr-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 pr-2">
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produto</FormLabel>
                    <FormControl>
                      <CatalogProductSelector
                          products={catalogProducts || []}
                          categories={catalogCategories || []}
                          selectedValue={field.value}
                          onValueChange={handleProductSelect}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isMultiLocation && (
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Localização de Origem</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a localização" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations?.map(location => (
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
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                      <FormItem>
                      <div className="flex justify-between items-baseline">
                          <FormLabel>Quantidade</FormLabel>
                          {selectedProductInstance && <p className="text-xs text-muted-foreground">Disponível: {availableStock}</p>}
                      </div>
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
                  <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>

              <DialogFooter className="pt-4">
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSubmitDisabled}>Registrar Venda</Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function AddSaleDialog(props: AddSaleDialogProps) {
  const [isClient, setIsClient] = useState(false);
  const inventoryContext = useContext(InventoryContext);

  useEffect(() => {
    setIsClient(true)
  }, []);
  
  if (!isClient || !inventoryContext) {
     return props.triggerType === 'fab' ? (
       <Button disabled className="fixed bottom-6 right-4 sm:right-6 h-14 w-14 rounded-full shadow-2xl z-50">
          <Plus className="h-6 w-6" />
      </Button>
     ) : (
        <Button variant="outline" disabled>
            <ShoppingCart className="mr-2 h-4 w-4" />+ Vendas
        </Button>
     );
  }

  return <AddSaleDialogContent {...props} />;
}
