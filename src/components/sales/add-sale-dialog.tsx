
"use client";

import { useState, useEffect } from 'react';
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
import { PlusCircle } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from '@/hooks/use-toast';
import type { Product, Location } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const formSchema = z.object({
  productId: z.string().nonempty({ message: "Por favor, selecione um produto." }),
  quantity: z.coerce.number().min(1, { message: "A quantidade deve ser pelo menos 1." }),
  unitPrice: z.coerce.number().min(0, { message: "O preço não pode ser negativo." }),
  location: z.string().optional(),
});

type AddSaleFormValues = z.infer<typeof formSchema>;

interface AddSaleDialogProps {
    products: Product[];
    onAddSale: (data: AddSaleFormValues) => void;
}

function AddSaleDialogContent({ products, onAddSale }: AddSaleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isMultiLocation, setIsMultiLocation] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const { toast } = useToast();
  
  const form = useForm<AddSaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: "",
      quantity: 1,
      unitPrice: 0,
      location: "",
    },
  });
  
  const watchedProductId = useWatch({ control: form.control, name: 'productId' });
  const watchedQuantity = useWatch({ control: form.control, name: 'quantity' });
  const watchedUnitPrice = useWatch({ control: form.control, name: 'unitPrice' });
  const watchedLocation = useWatch({ control: form.control, name: 'location' });

  const selectedProduct = products.find(p => p.id === watchedProductId);
  const isStockSufficient = selectedProduct ? watchedQuantity <= selectedProduct.stock : false;

  useEffect(() => {
    if (selectedProduct) {
      form.setValue('unitPrice', selectedProduct.price);
    } else {
      form.setValue('unitPrice', 0);
    }
  }, [selectedProduct, form]);

  useEffect(() => {
    if(selectedProduct){
      const stockIsSufficient = watchedQuantity <= selectedProduct.stock;
      const locationIsCorrect = !isMultiLocation || selectedProduct.location === watchedLocation;
      if (!stockIsSufficient) {
        form.setError("quantity", { type: "manual", message: `Estoque insuficiente. Disponível: ${selectedProduct.stock}` });
      } else if (!locationIsCorrect) {
        form.setError("productId", { type: "manual", message: `Produto não existe nesta localização.` });
      } else {
        form.clearErrors("quantity");
        form.clearErrors("productId");
      }
    }
  }, [watchedQuantity, selectedProduct, watchedLocation, isMultiLocation, form]);


  const totalValue = (watchedUnitPrice || 0) * (watchedQuantity || 0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const multiLocationEnabled = localStorage.getItem('majorstockx-multi-location-enabled') === 'true';
      setIsMultiLocation(multiLocationEnabled);
      
      const storedLocations = localStorage.getItem('majorstockx-locations');
      if (storedLocations) {
        const parsedLocations: Location[] = JSON.parse(storedLocations);
        setLocations(parsedLocations);
        if (parsedLocations.length > 0) {
            form.setValue('location', parsedLocations[0].id)
        }
      }
    }
  }, [form]);


  function onSubmit(values: AddSaleFormValues) {
    if (isMultiLocation && !values.location) {
      form.setError("location", { type: "manual", message: "Por favor, selecione uma localização." });
      return;
    }

    const product = products.find(p => p.id === values.productId);
    if (!product) return;

    if (values.quantity > product.stock) {
      toast({
        variant: "destructive",
        title: "Estoque Insuficiente",
        description: `Não há estoque suficiente para ${product.name}. Disponível: ${product.stock}, Solicitado: ${values.quantity}.`,
      });
      return;
    }
    
    if (isMultiLocation && product.location !== values.location) {
        toast({
            variant: "destructive",
            title: "Localização Incorreta",
            description: `O produto ${product.name} não está disponível na localização selecionada.`,
        });
        return;
    }

    onAddSale(values);
    const productName = product.name;
    toast({
        title: "Venda Registrada",
        description: `A venda de ${values.quantity} unidades de ${productName} foi registrada.`,
    })
    form.reset();
    if (locations.length > 0) {
      form.setValue('location', locations[0].id);
    }
    setOpen(false);
  }
  
  const isSubmitDisabled = !form.formState.isValid || form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Registrar Venda
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Nova Venda</DialogTitle>
          <DialogDescription>
            Selecione o produto e a quantidade para registrar uma nova venda.
          </DialogDescription>
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
             {isMultiLocation && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização de Origem</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a localização" />
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
            )}
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Quantidade Vendida</FormLabel>
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

            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitDisabled}>Registrar Venda</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function AddSaleDialog(props: AddSaleDialogProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient ? <AddSaleDialogContent {...props} /> : (
     <Button disabled>
        <PlusCircle className="mr-2 h-4 w-4" />
        Registrar Venda
    </Button>
  );
}
