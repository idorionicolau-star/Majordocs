

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
import { ProductImageField } from "@/components/catalog/product-image-field";
import { CostBarcodeFields } from "@/components/catalog/cost-barcode-fields";
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
  unit: z.string().optional(),
  imageUrl: z.string().optional(),
  cost: z.preprocess((val) => {
    if (val === undefined || val === "" || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number().min(0, { message: "O custo não pode ser negativo." })),
  barcode: z.string().optional(),
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
  units: string[];
  onAdd: (product: Omit<CatalogProduct, 'id'>) => void;
  /** Produtos já no catálogo (para avisar de códigos de barras repetidos). */
  catalog?: { id?: string; name: string; barcode?: string }[];
}

function AddCatalogProductForm({
  categories,
  units,
  onAdd,
  setOpen,
  form,
  namePlaceholder,
  pricePlaceholder,
  catalog
}: AddCatalogProductDialogProps & { setOpen: (open: boolean) => void; form: any; namePlaceholder: string; pricePlaceholder: string }) {
  function onSubmit(values: FormValues) {
    // sem "undefined" (o Firestore recusa): custo 0 e código '' querem dizer "não tem"
    onAdd({ ...values, cost: values.cost || 0, barcode: (values.barcode || '').trim() } as Omit<CatalogProduct, 'id'>);
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
              <Select onValueChange={field.onChange} value={field.value}>
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
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Foto (opcional)</FormLabel>
              <ProductImageField value={field.value} onChange={field.onChange} />
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
                <Select onValueChange={field.onChange} value={field.value}>
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
        <CostBarcodeFields catalog={catalog || []} />
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

export function AddCatalogProductDialog({ categories, units, onAdd, catalog, open: openProp, onOpenChange, hideTrigger, defaultCategory, defaultName, initial }: AddCatalogProductDialogProps & {
  /** Modo controlado: a página decide quando abre (ex.: botão + no telemóvel). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  /** Categoria pré-escolhida (ex.: a que está filtrada na lista). */
  defaultCategory?: string;
  /** Nome pré-preenchido (ex.: o que se procurou e não existe). */
  defaultName?: string;
  /** Valores de partida (ex.: duplicar um produto). */
  initial?: Partial<FormValues>;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = openProp ?? innerOpen;
  const setOpen = (o: boolean) => { setInnerOpen(o); onOpenChange?.(o); };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: categories[0] || '',
      price: 0,
      unit: 'un',
      imageUrl: '',
      cost: 0,
      barcode: '',
      lowStockThreshold: 10,
      criticalStockThreshold: 5,
    },
  });

  const namePlaceholder = useDynamicPlaceholder('product');
  const pricePlaceholder = useDynamicPlaceholder('money');

  // sempre que abre, o formulário começa limpo (antes ficava com o produto anterior)
  useEffect(() => {
    if (open) form.reset({ name: defaultName || '', category: defaultCategory || categories[0] || '', price: 0, unit: 'un', imageUrl: '', cost: 0, barcode: '', lowStockThreshold: 10, criticalStockThreshold: 5, ...(initial || {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      trigger={hideTrigger ? undefined : trigger}
    >
      <div className="md:max-h-[85vh] md:overflow-y-auto md:pr-2">
        <AddCatalogProductForm
          categories={categories}
          units={units}
          onAdd={onAdd}
          catalog={catalog}
          setOpen={setOpen}
          form={form}
          namePlaceholder={namePlaceholder}
          pricePlaceholder={pricePlaceholder}
        />
      </div>
    </ResponsiveDialog>
  );
}

