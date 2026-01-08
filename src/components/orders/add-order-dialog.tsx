
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
import { Plus, ClipboardList } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from '@/hooks/use-toast';
import type { Product, Order } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '../ui/tooltip';

const formSchema = z.object({
  productId: z.string().nonempty({ message: "Por favor, selecione um produto." }),
  quantity: z.coerce.number().min(1, { message: "A quantidade deve ser pelo menos 1." }),
  unit: z.enum(['un', 'm²', 'm', 'cj', 'outro']),
  clientName: z.string().optional(),
  deliveryDate: z.date({ required_error: "A data de entrega é obrigatória." }),
});

type AddOrderFormValues = z.infer<typeof formSchema>;

interface AddOrderDialogProps {
    products: Product[];
    onAddOrder: (order: Omit<Order, 'id' | 'status' | 'quantityProduced' | 'productionLogs' | 'productionStartDate'>) => void;
    triggerType?: 'button' | 'fab';
}

export function AddOrderDialog({ products, onAddOrder, triggerType = 'fab' }: AddOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<AddOrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: "",
      quantity: 1,
      unit: 'un',
      clientName: "",
    },
  });

  function onSubmit(values: AddOrderFormValues) {
    const product = products.find(p => p.id === values.productId);
    if (!product) return;

    const newOrder: Omit<Order, 'id' | 'status' | 'quantityProduced' | 'productionLogs' | 'productionStartDate'> = {
      productId: values.productId,
      productName: product.name,
      quantity: values.quantity,
      unit: values.unit,
      clientName: values.clientName,
      deliveryDate: values.deliveryDate.toISOString(),
    };
    onAddOrder(newOrder);

    toast({
        title: "Encomenda Registrada",
        description: `A encomenda de ${values.quantity} ${values.unit} de ${product.name} foi registrada.`,
    })
    form.reset();
    setOpen(false);
  }
  
  const TriggerComponent = triggerType === 'fab' ? (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <DialogTrigger asChild>
                    <Button className="fixed bottom-20 right-4 sm:right-6 h-14 w-14 rounded-full shadow-2xl z-50">
                        <Plus className="h-6 w-6" />
                    </Button>
                </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="left">
                <p>Nova Encomenda</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  ) : (
    <DialogTrigger asChild>
        <Button variant="outline">
            <ClipboardList className="mr-2 h-4 w-4" />+ Encomenda
        </Button>
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {TriggerComponent}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Encomenda de Produção</DialogTitle>
          <DialogDescription>
            Registe uma nova encomenda para a equipe de produção.
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl><Input type="number" min="1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="un">Unidade (un)</SelectItem>
                            <SelectItem value="m²">Metro Quadrado (m²)</SelectItem>
                            <SelectItem value="m">Metro Linear (m)</SelectItem>
                            <SelectItem value="cj">Conjunto (cj)</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente (Opcional)</FormLabel>
                  <FormControl><Input placeholder="Nome do cliente" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deliveryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Entrega</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0,0,0,0)) 
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Adicionar Encomenda</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
