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
[
  {
    "TargetContent": "import { Input } from \"@/components/ui/input\";",
    "ReplacementContent": "import { Input } from \"@/components/ui/input\";\nimport { MathInput } from \"@/components/ui/math-input\";",
    "StartLine": 29,
    "EndLine": 29,
    "AllowMultiple": false
  },
  {
    "TargetContent": "                  <FormControl>\n                    <Input type=\"number\" step=\"0.01\" {...field} />\n                  </FormControl>",
    "ReplacementContent": "                  <FormControl>\n                    <MathInput \n                      {...field} \n                      onValueChange={field.onChange} \n                      placeholder=\"0.00\" \n                    />\n                  </FormControl>",
    "StartLine": 170,
    "EndLine": 172,
    "AllowMultiple": false
  },
  {
    "TargetContent": "                  <FormControl>\n                    <Input type=\"number\" step=\"any\" {...field} />\n                  </FormControl>",
    "ReplacementContent": "                  <FormControl>\n                     <MathInput \n                      {...field} \n                      onValueChange={field.onChange} \n                      placeholder=\"0\"\n                    />\n                  </FormControl>",
    "StartLine": 184,
    "EndLine": 186,
    "AllowMultiple": false
  },
  {
    "TargetContent": "                  <FormControl>\n                    <Input type=\"number\" {...field} />\n                  </FormControl>",
    "ReplacementContent": "                  <FormControl>\n                    <MathInput \n                      {...field} \n                      onValueChange={field.onChange} \n                      placeholder=\"0\"\n                    />\n                  </FormControl>",
    "StartLine": 223,
    "EndLine": 225,
    "AllowMultiple": true
  }
]
import { Edit2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Product, Location } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';
import { useDynamicPlaceholder } from '@/hooks/use-dynamic-placeholder';

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  category: z.string().min(2, { message: "A categoria deve ter pelo menos 2 caracteres." }),
  price: z.preprocess((val) => {
    if (val === undefined || val === "" || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number().min(0, { message: "O preço não pode ser negativo." })),
  stock: z.preprocess((val) => {
    if (val === undefined || val === "" || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number().min(0, { message: "O estoque não pode ser negativo." })),
  unit: z.string().default('un'),
  lowStockThreshold: z.preprocess((val) => {
    if (val === undefined || val === "" || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number().min(0, { message: "O limite não pode ser negativo." })),
  criticalStockThreshold: z.preprocess((val) => {
    if (val === undefined || val === "" || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number().min(0, { message: "O limite não pode ser negativo." })),
  location: z.string().optional(),
});

type EditProductFormValues = z.infer<typeof formSchema>;

interface EditProductDialogProps {
  product: Product;
  onProductUpdate: (product: Product) => void;
  trigger: 'icon' | 'button' | 'card-button';
  locations: Location[];
  isMultiLocation: boolean;
}

function EditProductDialogContent({ product, onProductUpdate, setOpen, locations, isMultiLocation }: Omit<EditProductDialogProps, 'trigger'> & { setOpen: (open: boolean) => void }) {
  const { availableUnits } = useInventory();
  const form = useForm<EditProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      unit: product.unit || 'un',
      lowStockThreshold: product.lowStockThreshold,
      criticalStockThreshold: product.criticalStockThreshold,
      location: product.location || '',
    },
  });

  function onSubmit(values: EditProductFormValues) {
    onProductUpdate({
      ...product,
      ...values,
    });
    setOpen(false);
  }

  return (
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma localização" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((location: Location) => (
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
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
                        {availableUnits.map((u: string) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
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
  );
}



const EditProductTrigger = ({ trigger }: { trigger: 'icon' | 'button' | 'card-button' }) => {
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

export function EditProductDialog({ product, onProductUpdate, trigger, locations, isMultiLocation }: EditProductDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <EditProductTrigger trigger={trigger} />
      {open && <EditProductDialogContent product={product} onProductUpdate={onProductUpdate} setOpen={setOpen} locations={locations} isMultiLocation={isMultiLocation} />}
    </Dialog>
  );
}
