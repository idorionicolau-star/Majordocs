
"use client";

import { useState } from 'react';
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  quantity: z.coerce.number().min(1, { message: "A quantidade deve ser pelo menos 1." }),
  notes: z.string().optional(),
});

type AddLogFormValues = z.infer<typeof formSchema>;

interface AddProductionLogDialogProps {
  order: Order;
  onAddLog: (orderId: string, logData: { quantity: number; notes?: string }) => void;
}

export function AddProductionLogDialog({ order, onAddLog }: AddProductionLogDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddLogFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 0,
      notes: "",
    },
  });
  
  const remainingQuantity = order.quantity - order.quantityProduced;

  function onSubmit(values: AddLogFormValues) {
    if (values.quantity > remainingQuantity) {
        form.setError("quantity", { type: "manual", message: `A quantidade excede o restante. Faltam ${remainingQuantity}.` });
        return;
    }

    onAddLog(order.id, values);
    form.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1" size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Registar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registar Progresso de Produção</DialogTitle>
          <p className='text-sm text-muted-foreground'>Para a encomenda #{order.id} de {order.productName}</p>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <div className='flex items-baseline justify-between'>
                    <FormLabel>Quantidade Produzida Hoje</FormLabel>
                    <p className='text-xs text-muted-foreground'>Faltam: {remainingQuantity}</p>
                  </div>
                  <FormControl>
                    <Input type="number" min="1" max={remainingQuantity} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Alguma observação sobre a produção de hoje?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Adicionar Registo</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
