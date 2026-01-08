
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadCloud, FileText, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { products as initialProducts } from '@/lib/data';
import type { Product } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CatalogManager() {
  const [textData, setTextData] = useState('');
  const [fileName, setFileName] = useState('');
  const { toast } = useToast();

  const [products, setProducts] = useState<Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  
  useEffect(() => {
    // In a real app, this would be fetched from a database
    const uniqueProducts = initialProducts.filter((p, i, a) => a.findIndex(v => v.id === p.id) === i)
        .map(({ stock, instanceId, reservedStock, location, lastUpdated, ...rest }) => rest);
    
    const uniqueCategories = Array.from(new Set(initialProducts.map(p => p.category)));
    
    setProducts(uniqueProducts);
    setCategories(uniqueCategories);
  }, []);
  
  const handleImportText = () => {
    // ... logic for importing from text
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // ... logic for handling file changes
  };
  
  const handleImportFile = () => {
    // ... logic for importing from file
  };
  
  const handleAddCategory = () => {
    const newCategory = prompt('Nome da nova categoria:');
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      toast({ title: 'Categoria Adicionada', description: `A categoria "${newCategory}" foi adicionada.` });
    } else if (newCategory) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Essa categoria já existe.' });
    }
  };

  const confirmDeleteCategory = () => {
    if (categoryToDelete) {
      // Check if category is in use
      const isUsed = products.some(p => p.category === categoryToDelete);
      if (isUsed) {
        toast({
          variant: 'destructive',
          title: 'Não é possível remover',
          description: `A categoria "${categoryToDelete}" está a ser usada por produtos.`,
        });
      } else {
        setCategories(categories.filter(c => c !== categoryToDelete));
        toast({ title: 'Categoria Removida' });
      }
      setCategoryToDelete(null);
    }
  };

  const confirmDeleteProduct = () => {
     if (productToDelete) {
        setProducts(products.filter(p => p.id !== productToDelete.id));
        toast({ title: 'Produto Removido do Catálogo' });
        setProductToDelete(null);
    }
  }


  return (
    <>
       <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isto irá apagar permanentemente a categoria
              "{categoryToDelete}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover "{productToDelete?.name}" do seu catálogo de produtos base. Isto não afeta o stock existente no inventário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProduct}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="products">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="import">Importar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="products" className="mt-4">
           <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Gerencie os produtos base do seu catálogo.</p>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Produto
              </Button>
            </div>
             <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(product => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell className="text-right">{product.price.toFixed(2)} MT</TableCell>
                       <TableCell className="text-right">
                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setProductToDelete(product)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="categories" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Gerencie as categorias de produtos.</p>
              <Button size="sm" onClick={handleAddCategory}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Categoria
              </Button>
            </div>
            <div className="rounded-md border">
              <ul className="divide-y">
                {categories.map(category => (
                  <li key={category} className="flex items-center justify-between p-3">
                    <span className="text-sm font-medium">{category}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCategoryToDelete(category)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="import" className="mt-4">
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Carregue um catálogo de produtos colando uma lista (CSV, TSV) ou carregando um ficheiro (Excel, CSV).
                </p>
                <Tabs defaultValue="paste">
                    <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="paste">
                        <FileText className="mr-2 h-4 w-4" />
                        Colar Texto
                    </TabsTrigger>
                    <TabsTrigger value="upload">
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Carregar Ficheiro
                    </TabsTrigger>
                    </TabsList>
                    <TabsContent value="paste" className="mt-4">
                    <div className="space-y-3">
                        <Textarea
                        placeholder="Cole aqui os dados do seu catálogo. Ex: Nome,Categoria,Preço..."
                        className="min-h-[200px]"
                        value={textData}
                        onChange={(e) => setTextData(e.target.value)}
                        />
                        <Button onClick={handleImportText} className="w-full">Importar de Texto</Button>
                    </div>
                    </TabsContent>
                    <TabsContent value="upload" className="mt-4">
                    <div className="space-y-3">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="catalog-file">Ficheiro do Catálogo</Label>
                        <Input id="catalog-file" type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} />
                        </div>
                        {fileName && <p className="text-sm text-muted-foreground">Ficheiro selecionado: <strong>{fileName}</strong></p>}
                        <Button onClick={handleImportFile} className="w-full">Importar de Ficheiro</Button>
                    </div>
                    </TabsContent>
                </Tabs>
            </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

    