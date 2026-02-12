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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useMediaQuery } from '@/hooks/use-media-query';

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
import { MathInput } from "@/components/ui/math-input";

import { Edit2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Product, Location } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';
import { useDynamicPlaceholder } from '@/hooks/use-dynamic-placeholder';
import { useInventory } from "@/context/inventory-context";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useStorage } from "@/firebase/provider";
import { Loader2, Image as ImageIcon, X } from "lucide-react";

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

function EditProductForm({ product, onProductUpdate, setOpen, locations, isMultiLocation }: Omit<EditProductDialogProps, 'trigger'> & { setOpen: (open: boolean) => void }) {
  const { availableUnits } = useInventory();
  const storage = useStorage();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(product.imageUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  async function onSubmit(values: EditProductFormValues) {
    setIsSubmitting(true);
    let imageUrl = product.imageUrl;

    if (imageFile) {
      try {
        const storageRef = ref(storage, `product-images/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      } catch (error) {
        console.error("Error uploading image:", error);
        // We proceed even if image upload fails, but could show a toast here
      }
    } else if (previewUrl === null && product.imageUrl) {
      // Image was removed
      imageUrl = null as any;
    }


    onProductUpdate({
      ...product,
      ...values,
      imageUrl,
    });
    setIsSubmitting(false);
    setOpen(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 pr-2">

        {/* Image Upload Section */}
        <div className="flex flex-col gap-3 mb-4">
          <FormLabel>Imagem do Produto</FormLabel>
          <div className="flex items-start gap-4">
            <div className="relative h-24 w-24 rounded-lg border overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
              {previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => {
                        setImageFile(null);
                        setPreviewUrl(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-slate-400">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    setImageFile(file);
                    setPreviewUrl(URL.createObjectURL(file));
                  }
                }}
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <p className="text-xs text-muted-foreground">
                Adicione ou altere a imagem do produto. (JPG, PNG)
              </p>
            </div>
          </div>
        </div>

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
                <MathInput
                  {...field}
                  onValueChange={field.onChange}
                  ref={field.ref}
                />
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
                  <MathInput
                    {...field}
                    onValueChange={field.onChange}
                    ref={field.ref}
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
                  <MathInput
                    {...field}
                    onValueChange={field.onChange}
                    ref={field.ref}
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
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </form>
    </Form>
  );
}




const EditProductTrigger = ({ trigger, isDrawer }: { trigger: 'icon' | 'button' | 'card-button', isDrawer?: boolean }) => {
  const Trigger = isDrawer ? DrawerTrigger : DialogTrigger;

  if (trigger === 'icon') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Trigger asChild>
              <Button variant="ghost" size="icon" className="p-3 h-auto w-auto text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all">
                <Edit2 className="h-4 w-4" />
                <span className="sr-only">Editar</span>
              </Button>
            </Trigger>
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
            <Trigger asChild>
              <Button variant="outline" size="icon" className="flex-1 h-8 sm:h-9">
                <Edit2 className="h-4 w-4" />
              </Button>
            </Trigger>
          </TooltipTrigger>
          <TooltipContent><p>Editar Produto</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  return (
    <Trigger asChild>
      <Button variant="outline" className="w-full">
        <Edit2 className="mr-2 h-4 w-4" />
        Editar
      </Button>
    </Trigger>
  )
}


export function EditProductDialog({ product, onProductUpdate, trigger, locations, isMultiLocation }: EditProductDialogProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <EditProductTrigger trigger={trigger} />
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>
              Atualize os detalhes do produto. Clique em salvar para aplicar as alterações.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] -mr-3 pr-3">
            <EditProductForm
              product={product}
              onProductUpdate={onProductUpdate}
              setOpen={setOpen}
              locations={locations}
              isMultiLocation={isMultiLocation}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <EditProductTrigger trigger={trigger} isDrawer />
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Editar Produto</DrawerTitle>
          <DrawerDescription>
            Atualize os detalhes do produto.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-8 overflow-y-auto max-h-[85vh]">
          <EditProductForm
            product={product}
            onProductUpdate={onProductUpdate}
            setOpen={setOpen}
            locations={locations}
            isMultiLocation={isMultiLocation}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

