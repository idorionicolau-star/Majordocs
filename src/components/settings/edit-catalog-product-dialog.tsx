

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
import { Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Product } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  category: z.string().min(2, { message: "A categoria é obrigatória." }),
  price: z.preprocess((val) => {
    if (val === undefined || val === "" || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number().min(0, { message: "O preço não pode ser negativo." })),
  unit: z.string().optional(),
  lowStockThreshold: z.preprocess((val) => {
    if (val === undefined || val === "" || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number().min(0)),
  criticalStockThreshold: z.preprocess((val) => {
    if (val === undefined || val === "" || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number().min(0)),
});

type FormValues = z.infer<typeof formSchema>;

interface EditCatalogProductDialogProps {
  product: Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'> & { id?: string };
  categories: string[];
  units: string[];
  onUpdate: (productId: string, data: Partial<Product>) => void;
}

function EditCatalogProductDialogContent({ product, categories, units, onUpdate, setOpen }: EditCatalogProductDialogProps & { setOpen: (open: boolean) => void; }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...product, unit: product.unit || 'un' },
  });

  function onSubmit(values: FormValues) {
    if (product.id) {
      onUpdate(product.id, values);
    }
    setOpen(false);
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Editar Produto do Catálogo</DialogTitle>
        <DialogDescription>
          Altere os detalhes base deste produto.
        </DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-[70vh] -mr-3 pr-3">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 pr-2">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
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
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.length > 0 ? units.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        )) : (
                          <SelectItem value="un">un</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
  )
}

export function EditCatalogProductDialog(props: EditCatalogProductDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Edit className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      {open && <EditCatalogProductDialogContent {...props} setOpen={setOpen} />}
    </Dialog>
  );
}
