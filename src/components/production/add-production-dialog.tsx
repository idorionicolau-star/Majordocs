
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
import { Plus, Hammer } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Product, Location, Production } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const formSchema = z.object({
  productId: z.string().nonempty({ message: "Por favor, selecione um produto." }),
  quantity: z.coerce.number().min(1, { message: "A quantidade deve ser pelo menos 1." }),
  location: z.string().optional(),
});

type AddProductionFormValues = z.infer<typeof formSchema>;

interface AddProductionDialogProps {
    products: Product[];
    onAddProduction: (data: Omit<Production, 'id' | 'date' | 'registeredBy' | 'status'>) => void;
    triggerType?: 'button' | 'fab';
}

export function AddProductionDialog({ products, onAddProduction, triggerType = 'fab' }: AddProductionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isMultiLocation, setIsMultiLocation] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  
  const form = useForm<AddProductionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: "",
      quantity: 1,
      location: "",
    },
  });

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

  function onSubmit(values: AddProductionFormValues) {
     if (isMultiLocation && !values.location) {
      form.setError("location", { type: "manual", message: "Por favor, selecione uma localização." });
      return;
    }
    const product = products.find(p => p.id === values.productId);
    if (!product) return;

    onAddProduction({
      productName: product.name,
      quantity: values.quantity,
      location: values.location,
    });

    form.reset();
     if (locations.length > 0) {
      form.setValue('location', locations[0].id);
    }
    setOpen(false);
  }
  
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
                <p>Registrar Produção</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  ) : (
     <DialogTrigger asChild>
        <Button variant="outline">
            <Hammer className="mr-2 h-4 w-4" />+ Produção
        </Button>
    </DialogTrigger>
  );


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {TriggerComponent}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Nova Produção</DialogTitle>
          <DialogDescription>
            Selecione o produto e a quantidade para registrar uma nova entrada de produção.
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
                        <SelectValue placeholder="Selecione um produto fabricado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.filter((p, i, a) => a.findIndex(v => v.id === p.id) === i).map(product => (
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
                    <FormLabel>Localização de Destino</FormLabel>
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
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade Produzida</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Registrar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
