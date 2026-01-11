
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
import { Edit2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Product, Location } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  category: z.string().min(2, { message: "A categoria deve ter pelo menos 2 caracteres." }),
  price: z.coerce.number().min(0, { message: "O preço não pode ser negativo." }),
  stock: z.coerce.number().min(0, { message: "O estoque não pode ser negativo." }),
  lowStockThreshold: z.coerce.number().min(0, { message: "O limite não pode ser negativo." }),
  criticalStockThreshold: z.coerce.number().min(0, { message: "O limite não pode ser negativo." }),
  location: z.string().optional(),
});

type EditProductFormValues = z.infer<typeof formSchema>;

interface EditProductDialogProps {
    product: Product;
    onProductUpdate: (product: Product) => void;
    isMultiLocation: boolean;
    locations: Location[];
    trigger: 'icon' | 'button' | 'card-button';
}

function EditProductDialogContent({ product, onProductUpdate, isMultiLocation, locations, trigger }: EditProductDialogProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<EditProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        criticalStockThreshold: product.criticalStockThreshold,
        location: product.location,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        criticalStockThreshold: product.criticalStockThreshold,
        location: product.location,
      });
    }
  }, [open, product, form]);

  function onSubmit(values: EditProductFormValues) {
    if (isMultiLocation && !values.location) {
      form.setError("location", { type: "manual", message: "Por favor, selecione uma localização." });
      return;
    }
    onProductUpdate({
        ...product,
        ...values,
    });
    setOpen(false);
  }

  const TriggerComponent = () => {
    if (trigger === 'icon') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="p-3 h-auto w-auto text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all">
                      <Edit2 className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                  </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Editar Produto</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (trigger === 'card-button') {
        return (
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="flex-1 h-8 sm:h-9">
                                <Edit2 className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent><p>Editar Produto</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }
    return (
      <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
              <Edit2 className="mr-2 h-4 w-4" />
              Editar
          </Button>
      </DialogTrigger>
    )
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
     <TriggerComponent />
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
          <DialogDescription>
            Atualize os detalhes do produto. Clique em salvar para aplicar as alterações.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] -mr-3 pr-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Nome do Produto</FormLabel>
                      <FormControl>
                          <Input placeholder="Ex: Grelha 30x30" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                          <Input placeholder="Ex: Grelhas" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              </div>
              {isMultiLocation && (
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Localização</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma localização" />
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
                  name="price"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Preço Unitário (MT)</FormLabel>
                      <FormControl>
                          <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              <div className="grid grid-cols-3 gap-4">
                  <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Estoque</FormLabel>
                      <FormControl>
                          <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="lowStockThreshold"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Alerta Baixo</FormLabel>
                      <FormControl>
                          <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="criticalStockThreshold"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Alerta Crítico</FormLabel>
                      <FormControl>
                          <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              </div>
              <DialogFooter className="pt-4">
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


export function EditProductDialog(props: EditProductDialogProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return isClient ? <EditProductDialogContent {...props} /> : (
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
            <Edit2 className="h-4 w-4" />
            <span className="sr-only">Editar</span>
        </Button>
    );
}
