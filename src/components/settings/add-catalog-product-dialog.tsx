

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
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

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
import { Plus } from "lucide-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Product } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';
import { useDynamicPlaceholder } from '@/hooks/use-dynamic-placeholder';

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  category: z.string().min(2, { message: "A categoria é obrigatória." }),
  price: z.preprocess((val) => {
    if (val === undefined || val === "" || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number().min(0, { message: "O preço não pode ser negativo." })),
  unit: z.enum(['un', 'm²', 'm', 'cj', 'outro']).optional(),
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
type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;

interface AddCatalogProductDialogProps {
  categories: string[];
  onAdd: (product: Omit<CatalogProduct, 'id'>) => void;
}

function AddCatalogProductForm({
  categories,
  onAdd,
  setOpen,
  form,
  namePlaceholder,
  pricePlaceholder
}: AddCatalogProductDialogProps & { setOpen: (open: boolean) => void; form: any; namePlaceholder: string; pricePlaceholder: string }) {
  function onSubmit(values: FormValues) {
    onAdd(values);
    setOpen(false);
  }

  return (
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
                <Input placeholder={namePlaceholder} {...field} />
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
                <FormLabel>Preço Padrão</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder={pricePlaceholder} {...field} />
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
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit">Adicionar ao Catálogo</Button>
        </div>
      </form>
    </Form>
  );
}

export function AddCatalogProductDialog({ categories, onAdd }: AddCatalogProductDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: categories[0] || '',
      price: 0,
      unit: 'un',
      lowStockThreshold: 10,
      criticalStockThreshold: 5,
    },
  });

  const namePlaceholder = useDynamicPlaceholder('product');
  const pricePlaceholder = useDynamicPlaceholder('money');

  const trigger = (
    <Button size="icon" className="rounded-full h-9 w-9" title="Adicionar Produto ao Catálogo">
      <Plus className="h-5 w-5" />
      <span className="sr-only">Adicionar Produto ao Catálogo</span>
    </Button>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      title="Adicionar Produto ao Catálogo"
      description="Crie um novo produto base que poderá ser usado no inventário."
      trigger={trigger}
    >
      <div className="max-h-[85vh] overflow-y-auto pr-2">
        <AddCatalogProductForm
          categories={categories}
          onAdd={onAdd}
          setOpen={setOpen}
          form={form}
          namePlaceholder={namePlaceholder}
          pricePlaceholder={pricePlaceholder}
        />
      </div>
    </ResponsiveDialog>
  );
}

