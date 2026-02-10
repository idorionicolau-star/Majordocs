
"use client";

import { useState, useEffect, useContext } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/drawer";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { MathInput } from "@/components/ui/math-input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Product, Location } from '@/lib/types';
import { InventoryContext } from '@/context/inventory-context';
import { calculateSimilarity } from '@/lib/utils';
import { CatalogProductSelector } from '../catalog/catalog-product-selector';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, AlertTriangle } from 'lucide-react';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;


const robustNumber = z.preprocess((val) => {
  if (val === undefined || val === "" || val === null) return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}, z.number().min(0, { message: "O valor não pode ser negativo." }));

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  category: z.string().min(1, { message: "A categoria é obrigatória." }),
  price: robustNumber,
  stock: robustNumber,
  unit: z.string().default('un'),
  lowStockThreshold: robustNumber,
  criticalStockThreshold: robustNumber,
  location: z.string().optional(),
});

type AddProductFormValues = z.infer<typeof formSchema>;

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduct: (product: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'>) => void;
}

interface AddProductFormProps {
  form: any;
  onSubmit: (values: AddProductFormValues) => void;
  onOpenChange: (open: boolean) => void;
  catalogProducts: CatalogProduct[];
  catalogCategories: any[];
  handleProductSelect: (name: string, product?: CatalogProduct) => void;
  similarProduct: any;
  setSimilarProduct: any;
  isCatalogProductSelected: boolean;
  showAddCategoryDialog: boolean;
  setShowAddCategoryDialog: (open: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  handleAddCategory: () => void;
  isMultiLocation: boolean;
  locations: Location[];
  availableUnits: string[];
}

function AddProductForm({
  form,
  onSubmit,
  onOpenChange,
  catalogProducts,
  catalogCategories,
  handleProductSelect,
  similarProduct,
  setSimilarProduct,
  isCatalogProductSelected,
  showAddCategoryDialog,
  setShowAddCategoryDialog,
  newCategoryName,
  setNewCategoryName,
  handleAddCategory,
  isMultiLocation,
  locations,
  availableUnits
}: AddProductFormProps) {
  const { products } = useContext(InventoryContext) || { products: [] };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 pr-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => {
            // Watch for changes to drive the fuzzy logic
            // eslint-disable-next-line react-hooks/rules-of-hooks
            useEffect(() => {
              if (!field.value || field.value.length < 3) {
                setSimilarProduct(null);
                return;
              }

              const handler = setTimeout(() => {
                let maxSim = 0;
                let bestMatch = null;

                for (const p of products) {
                  const sim = calculateSimilarity(field.value, p.name);
                  if (sim > 0.8 && sim < 1.0) {
                    if (sim > maxSim) {
                      maxSim = sim;
                      bestMatch = p;
                    }
                  }
                }

                if (bestMatch) {
                  setSimilarProduct({ name: bestMatch.name, match: maxSim });
                } else {
                  setSimilarProduct(null);
                }
              }, 500);

              return () => clearTimeout(handler);
            }, [field.value, products, setSimilarProduct]);

            return (
              <FormItem>
                <FormLabel>Produto</FormLabel>
                <FormControl>
                  <CatalogProductSelector
                    products={catalogProducts}
                    categories={catalogCategories}
                    selectedValue={field.value}
                    onValueChange={handleProductSelect}
                  />
                </FormControl>

                {similarProduct && (
                  <div className="mt-2 text-sm p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-yellow-800 dark:text-yellow-400">Possível Duplicado Encontrado</p>
                      <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                        Existe um produto muito similar no seu inventário: <strong>"{similarProduct.name}"</strong>.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 border-yellow-300 bg-yellow-100 hover:bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100 dark:border-yellow-700 dark:hover:bg-yellow-700 w-full sm:w-auto"
                        onClick={() => {
                          handleProductSelect(similarProduct.name, undefined);
                          setSimilarProduct(null);
                        }}
                        type="button"
                      >
                        Corrigir para "{similarProduct.name}"
                      </Button>
                    </div>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isCatalogProductSelected}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(catalogCategories || []).sort((a, b) => a.name.localeCompare(b.name)).map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isCatalogProductSelected && (
                  <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="flex-shrink-0">
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Adicionar Nova Categoria</DialogTitle>
                        <DialogDescription>
                          Digite o nome da nova categoria.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Input
                          placeholder="Nome da categoria"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCategory();
                            }
                          }}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setShowAddCategoryDialog(false)}>
                          Cancelar
                        </Button>
                        <Button type="button" onClick={handleAddCategory}>
                          Adicionar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              {isCatalogProductSelected && <FormDescription>A categoria é definida pelo produto do catálogo.</FormDescription>}
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
                <MathInput
                  {...field}
                  onValueChange={field.onChange}
                  placeholder="0.00"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estoque Inicial</FormLabel>
                <FormControl>
                  <MathInput
                    {...field}
                    onValueChange={field.onChange}
                    placeholder="0"
                  />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="lowStockThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alerta Baixo</FormLabel>
                <FormControl>
                  <MathInput
                    {...field}
                    onValueChange={field.onChange}
                    placeholder="10"
                  />
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
                  <MathInput
                    {...field}
                    onValueChange={field.onChange}
                    placeholder="5"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit">Adicionar Produto</Button>
        </div>
      </form>
    </Form>
  );
}

export function AddProductDialog({ open, onOpenChange, onAddProduct }: AddProductDialogProps) {
  const inventoryContext = useContext(InventoryContext);
  const { products, catalogCategories, catalogProducts, locations, isMultiLocation, addCatalogProduct, addCatalogCategory, availableUnits } = inventoryContext || { products: [], catalogCategories: [], catalogProducts: [], locations: [], isMultiLocation: false, addCatalogProduct: async () => { }, addCatalogCategory: async () => { }, availableUnits: [] };
  const [isCatalogProductSelected, setIsCatalogProductSelected] = useState(false);
  const { toast } = useToast();
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [similarProduct, setSimilarProduct] = useState<{ name: string; match: number } | null>(null);

  const form = useForm<AddProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      name: "",
      unit: "un",
      lowStockThreshold: 10,
      criticalStockThreshold: 5,
      location: "",
    },
  });

  useEffect(() => {
    if (!open) {
      setIsCatalogProductSelected(false);
    }

    if (open) {
      const savedLocation = localStorage.getItem('majorstockx-last-product-location');
      const locationExists = locations.some(l => l.id === savedLocation);
      const finalLocation = (savedLocation && locationExists)
        ? savedLocation
        : (locations.length > 0 ? locations[0].id : "");

      form.reset({
        category: "",
        name: "",
        unit: 'un',
        lowStockThreshold: 10,
        criticalStockThreshold: 5,
        location: finalLocation,
      });
    }
  }, [open, locations, form]);


  const handleProductSelect = (productName: string, product?: CatalogProduct) => {
    form.setValue('name', productName, { shouldValidate: true });
    if (product) {
      setIsCatalogProductSelected(true);
      form.setValue('price', product.price);
      form.setValue('lowStockThreshold', product.lowStockThreshold);
      form.setValue('criticalStockThreshold', product.criticalStockThreshold);
      form.setValue('category', product.category, { shouldValidate: true });
      if (product.unit) {
        form.setValue('unit', product.unit);
      }
    } else {
      setIsCatalogProductSelected(false);
      form.setValue('price', undefined);
      form.setValue('category', '', { shouldValidate: true });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome da categoria inválido',
        description: 'O nome da categoria não pode estar em branco.',
      });
      return;
    }
    if (addCatalogCategory) {
      await addCatalogCategory(newCategoryName);
      form.setValue('category', newCategoryName, { shouldValidate: true });
      setShowAddCategoryDialog(false);
      setNewCategoryName('');
      toast({
        title: 'Categoria adicionada',
        description: `"${newCategoryName}" foi adicionada e selecionada.`,
      });
    }
  };


  async function onSubmit(values: AddProductFormValues) {
    if (isMultiLocation && !values.location) {
      form.setError("location", { type: "manual", message: "Por favor, selecione uma localização." });
      return;
    }

    if (!isCatalogProductSelected) {
      if (!values.category.trim()) {
        form.setError("category", { type: "manual", message: "A categoria é obrigatória para novos produtos." });
        return;
      }
      try {
        if (addCatalogCategory) await addCatalogCategory(values.category);

        if (addCatalogProduct) {
          await addCatalogProduct({
            name: values.name,
            category: values.category,
            price: values.price,
            unit: values.unit,
            lowStockThreshold: values.lowStockThreshold,
            criticalStockThreshold: values.criticalStockThreshold,
          });
        }

        toast({
          title: "Produto de Catálogo Criado",
          description: `${values.name} foi adicionado ao catálogo.`,
        });

      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro ao Criar no Catálogo', description: error.message });
        return;
      }
    }

    if (values.location) {
      localStorage.setItem('majorstockx-last-product-location', values.location);
    }

    const newProduct: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'> = {
      name: values.name,
      category: values.category,
      price: values.price,
      stock: values.stock,
      unit: values.unit,
      lowStockThreshold: values.lowStockThreshold,
      criticalStockThreshold: values.criticalStockThreshold,
      location: values.location || (locations.length > 0 ? locations[0].id : 'Principal'),
    };
    onAddProduct(newProduct);
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar Novo Produto"
      description="Selecione um produto do catálogo ou digite um novo nome para criar."
    >
      <div className="max-h-[85vh] overflow-y-auto pr-2">
        <AddProductForm
          form={form}
          onSubmit={onSubmit}
          onOpenChange={onOpenChange}
          catalogProducts={catalogProducts}
          catalogCategories={catalogCategories}
          handleProductSelect={handleProductSelect}
          similarProduct={similarProduct}
          setSimilarProduct={setSimilarProduct}
          isCatalogProductSelected={isCatalogProductSelected}
          showAddCategoryDialog={showAddCategoryDialog}
          setShowAddCategoryDialog={setShowAddCategoryDialog}
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          handleAddCategory={handleAddCategory}
          isMultiLocation={isMultiLocation}
          locations={locations}
          availableUnits={availableUnits}
        />
      </div>
    </ResponsiveDialog>
  );
}

