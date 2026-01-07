
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Product } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  category: z.string().min(2, { message: "A categoria deve ter pelo menos 2 caracteres." }),
  stock: z.coerce.number().min(0, { message: "O estoque não pode ser negativo." }),
  lowStockThreshold: z.coerce.number().min(0, { message: "O limite não pode ser negativo." }),
  criticalStockThreshold: z.coerce.number().min(0, { message: "O limite não pode ser negativo." }),
});

type EditProductFormValues = z.infer<typeof formSchema>;

interface EditProductDialogProps {
    product: Product;
    onProductUpdate: (product: Product) => void;
}

function EditProductDialogContent({ product, onProductUpdate }: EditProductDialogProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<EditProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: product.name,
        category: product.category,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        criticalStockThreshold: product.criticalStockThreshold,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: product.name,
        category: product.category,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        criticalStockThreshold: product.criticalStockThreshold,
      });
    }
  }, [open, product, form]);

  function onSubmit(values: EditProductFormValues) {
    onProductUpdate({
        ...product,
        ...values,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Editar</span>
                </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Editar Produto</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
          <DialogDescription>
            Atualize os detalhes do produto. Clique em salvar para aplicar as alterações.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
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


export function EditProductDialog(props: EditProductDialogProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return isClient ? <EditProductDialogContent {...props} /> : (
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Editar</span>
        </Button>
    );
}
