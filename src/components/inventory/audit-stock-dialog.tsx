
"use client";

import { useState, useContext } from 'react';
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Product } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { InventoryContext } from '@/context/inventory-context';
import { Textarea } from '../ui/textarea';

const formSchema = z.object({
  physicalCount: z.coerce.number().min(0, { message: "A contagem não pode ser negativa." }),
  reason: z.string().min(3, { message: "O motivo deve ter pelo menos 3 caracteres." }),
});

type AuditStockFormValues = z.infer<typeof formSchema>;

interface AuditStockDialogProps {
    product: Product;
    trigger: 'icon' | 'button' | 'card-button';
}

function AuditStockDialogContent({ product, setOpen }: Omit<AuditStockDialogProps, 'trigger'> & { setOpen: (open: boolean) => void }) {
  const { auditStock } = useContext(InventoryContext) || {};
  const form = useForm<AuditStockFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        physicalCount: product.stock,
        reason: 'Auditoria de rotina',
    },
  });

  function onSubmit(values: AuditStockFormValues) {
    if (!auditStock) return;
    auditStock(product, values.physicalCount, values.reason);
    setOpen(false);
  }

  const systemStock = product.stock;
  const physicalCount = form.watch('physicalCount');
  const adjustment = physicalCount - systemStock;

  return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Auditoria de Stock: {product.name}</DialogTitle>
          <DialogDescription>
            Insira a contagem física para ajustar o stock do sistema.
          </DialogDescription>
        </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                    <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">Stock no Sistema</p>
                        <p className="text-2xl font-bold">{systemStock}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">Ajuste</p>
                        <p className={`text-2xl font-bold ${adjustment > 0 ? 'text-green-500' : adjustment < 0 ? 'text-destructive' : ''}`}>
                            {adjustment > 0 ? `+${adjustment}` : adjustment}
                        </p>
                    </div>
                </div>

                <FormField
                  control={form.control}
                  name="physicalCount"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Contagem Física Atual</FormLabel>
                      <FormControl>
                          <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Motivo do Ajuste</FormLabel>
                      <FormControl>
                          <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                />
              <DialogFooter className="pt-4">
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit">Confirmar Ajuste</Button>
              </DialogFooter>
            </form>
          </Form>
      </DialogContent>
  );
}


export function AuditStockDialog({ product, trigger }: AuditStockDialogProps) {
    const [open, setOpen] = useState(false);

    const TriggerComponent = () => {
      const buttonClasses = "text-amber-500 hover:bg-amber-500/10 hover:text-amber-600 dark:text-yellow-500 dark:hover:bg-yellow-500/10 dark:hover:text-yellow-400";
      if (trigger === 'icon') {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className={`p-3 h-auto w-auto rounded-xl transition-all ${buttonClasses}`}>
                        <FileCheck className="h-4 w-4" />
                        <span className="sr-only">Auditar Stock</span>
                    </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Auditar Stock</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      // Assuming 'card-button' is another icon-like button
      return (
           <TooltipProvider>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                          <Button variant="outline" size="icon" className={`flex-1 h-8 sm:h-9 ${buttonClasses}`}>
                              <FileCheck className="h-4 w-4" />
                          </Button>
                      </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Auditar Stock</p></TooltipContent>
              </Tooltip>
          </TooltipProvider>
      )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <TriggerComponent />
            {open && <AuditStockDialogContent product={product} setOpen={setOpen} />}
        </Dialog>
    );
}
