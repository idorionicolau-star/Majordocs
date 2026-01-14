
"use client";

import { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Trash2, Edit, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EditCatalogProductDialog } from './edit-catalog-product-dialog';
import { InventoryContext } from '@/context/inventory-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, deleteDoc, updateDoc, collection, writeBatch, query, getDocs, where, addDoc } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { AddCatalogProductDialog } from './add-catalog-product-dialog';
import { initialCatalog } from '@/lib/data';
import { DataImporter } from './data-importer';
import { Checkbox } from '../ui/checkbox';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'> & { id: string };
type CatalogCategory = { id: string; name: string };

export function CatalogManager() {
  const { toast } = useToast();
  const inventoryContext = useContext(InventoryContext);
  const firestore = useFirestore();

  const { companyId } = inventoryContext || {};
  
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showDeleteSelectedProductsConfirm, setShowDeleteSelectedProductsConfirm] = useState(false);
  const [showDeleteSelectedCategoriesConfirm, setShowDeleteSelectedCategoriesConfirm] = useState(false);


  const catalogProductsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/catalogProducts`);
  }, [firestore, companyId]);

  const catalogCategoriesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/catalogCategories`);
  }, [firestore, companyId]);

  const { data: products, isLoading: productsLoading } = useCollection<CatalogProduct>(catalogProductsCollectionRef);
  const { data: categories, isLoading: categoriesLoading } = useCollection<CatalogCategory>(catalogCategoriesCollectionRef);

  const [categoryToDelete, setCategoryToDelete] = useState<CatalogCategory | null>(null);
  const [productToDelete, setProductToDelete] = useState<CatalogProduct | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<CatalogCategory | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  
  useEffect(() => {
    setSelectedProducts([]);
  }, [products]);

  useEffect(() => {
    setSelectedCategories([]);
  }, [categories]);


  if (!inventoryContext) {
    return <div>A carregar gestor de catálogo...</div>
  }
  
  const handleAddCategory = async () => {
    if (!catalogCategoriesCollectionRef) return;
    if (!newCategoryName.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'O nome da categoria não pode estar em branco.' });
      return;
    }
    
    if (categories?.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Essa categoria já existe.' });
      return;
    }
      
    toast({ title: 'A adicionar categoria...' });
    const newCategory = { name: newCategoryName.trim() };
    try {
      await addDoc(catalogCategoriesCollectionRef, newCategory);
      toast({ title: 'Categoria Adicionada', description: `A categoria "${newCategoryName.trim()}" foi adicionada.` });
      setNewCategoryName('');
      setShowAddCategoryDialog(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível adicionar a categoria.' });
    }
  };
  
  const handleAddProduct = async (productData: Omit<CatalogProduct, 'id'>) => {
    if (!catalogProductsCollectionRef) return;
    toast({ title: 'A adicionar produto ao catálogo...' });
    try {
        await addDoc(catalogProductsCollectionRef, productData);
        toast({ title: 'Produto Adicionado', description: `O produto "${productData.name}" foi adicionado ao catálogo.` });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível adicionar o produto ao catálogo.' });
    }
  };

  const handleEditCategory = async () => {
    if (!categoryToEdit || !newCategoryName.trim() || !firestore || !companyId) return;

    if (categories?.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase() && c.id !== categoryToEdit.id)) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Essa categoria já existe.' });
      return;
    }
    
    toast({ title: 'A atualizar categoria...' });
    try {
      const categoryDocRef = doc(firestore, `companies/${companyId}/catalogCategories`, categoryToEdit.id);
      await updateDoc(categoryDocRef, { name: newCategoryName.trim() });
      
      const q = query(collection(firestore, `companies/${companyId}/catalogProducts`), where("category", "==", categoryToEdit.name));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { category: newCategoryName.trim() });
      });
      await batch.commit();

      toast({ title: 'Categoria Atualizada' });
    } catch(e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar a categoria.' });
    }

    setCategoryToEdit(null);
    setNewCategoryName('');
  };

  const startEditingCategory = (category: CatalogCategory) => {
    setCategoryToEdit(category);
    setNewCategoryName(category.name);
  }

  const confirmDeleteCategory = async () => {
    if (categoryToDelete && firestore && companyId) {
      const isUsed = products?.some(p => p.category === categoryToDelete.name);
      if (isUsed) {
        toast({
          variant: 'destructive',
          title: 'Não é possível remover',
          description: `A categoria "${categoryToDelete.name}" está a ser usada por produtos.`,
        });
      } else {
        toast({ title: 'A remover categoria...' });
        try {
          await deleteDoc(doc(firestore, `companies/${companyId}/catalogCategories`, categoryToDelete.id));
          toast({ title: 'Categoria Removida' });
        } catch(e) {
           toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover a categoria.' });
        }
      }
      setCategoryToDelete(null);
    }
  };

  const confirmDeleteProduct = async () => {
     if (productToDelete && firestore && companyId) {
        toast({ title: 'A remover produto...' });
        try {
            await deleteDoc(doc(firestore, `companies/${companyId}/catalogProducts`, productToDelete.id));
            toast({ title: 'Produto Removido do Catálogo' });
        } catch(e) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover o produto.' });
        }
        setProductToDelete(null);
    }
  }

  const handleUpdateProduct = async (updatedProduct: CatalogProduct) => {
    if(!firestore || !updatedProduct.id || !companyId) return;
    toast({ title: 'A atualizar produto...' });
    try {
        const productDocRef = doc(firestore, `companies/${companyId}/catalogProducts`, updatedProduct.id);
        await updateDoc(productDocRef, updatedProduct as any);
        toast({ title: "Produto do Catálogo Atualizado" });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o produto.' });
    }
  };
  
  const handleToggleSelectAllProducts = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(sortedProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleToggleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };
  
  const handleDeleteSelectedProducts = async () => {
    if (!firestore || !companyId || selectedProducts.length === 0) return;

    toast({ title: `A apagar ${selectedProducts.length} produtos...` });
    try {
      const batch = writeBatch(firestore);
      selectedProducts.forEach(productId => {
        const docRef = doc(firestore, `companies/${companyId}/catalogProducts`, productId);
        batch.delete(docRef);
      });
      await batch.commit();
      toast({ title: 'Produtos Apagados', description: `${selectedProducts.length} produtos foram removidos do catálogo.` });
      setSelectedProducts([]);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível apagar os produtos selecionados.' });
    }
    setShowDeleteSelectedProductsConfirm(false);
  };
  
  const handleToggleSelectAllCategories = (checked: boolean) => {
    if (checked) {
      setSelectedCategories(sortedCategories.map(c => c.id));
    } else {
      setSelectedCategories([]);
    }
  };
  
  const handleToggleSelectCategory = (categoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, categoryId]);
    } else {
      setSelectedCategories(prev => prev.filter(id => id !== categoryId));
    }
  };

  const handleDeleteSelectedCategories = async () => {
    if (!firestore || !companyId || selectedCategories.length === 0) return;

    const categoriesToDelete = sortedCategories.filter(c => selectedCategories.includes(c.id));
    const usedCategories = categoriesToDelete.filter(c => products?.some(p => p.category === c.name));

    if (usedCategories.length > 0) {
        toast({
            variant: 'destructive',
            title: 'Não é possível apagar',
            description: `As seguintes categorias estão em uso: ${usedCategories.map(c => c.name).join(', ')}`,
        });
        setShowDeleteSelectedCategoriesConfirm(false);
        return;
    }

    toast({ title: `A apagar ${selectedCategories.length} categorias...` });
    try {
      const batch = writeBatch(firestore);
      selectedCategories.forEach(categoryId => {
        const docRef = doc(firestore, `companies/${companyId}/catalogCategories`, categoryId);
        batch.delete(docRef);
      });
      await batch.commit();
      toast({ title: 'Categorias Apagadas', description: `${selectedCategories.length} categorias foram removidas.` });
      setSelectedCategories([]);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível apagar as categorias selecionadas.' });
    }
    setShowDeleteSelectedCategoriesConfirm(false);
  };

  const sortedCategories = categories ? [...categories].sort((a, b) => a.name.localeCompare(b.name)) : [];
  const sortedProducts = products ? [...products].sort((a,b) => a.name.localeCompare(b.name)) : [];

  return (
    <>
       <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover permanentemente a categoria "{categoryToDelete?.name}". Apenas pode remover categorias que não estejam a ser usadas por nenhum produto.
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
      
       <AlertDialog open={showDeleteSelectedProductsConfirm} onOpenChange={setShowDeleteSelectedProductsConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar Produtos Selecionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que quer apagar os {selectedProducts.length} produtos selecionados do catálogo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelectedProducts} variant="destructive">Sim, Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showDeleteSelectedCategoriesConfirm} onOpenChange={setShowDeleteSelectedCategoriesConfirm}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Apagar Categorias Selecionadas?</AlertDialogTitle>
                <AlertDialogDescription>
                Tem a certeza que quer apagar as {selectedCategories.length} categorias selecionadas? Apenas categorias que não estão a ser utilizadas por nenhum produto podem ser apagadas.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSelectedCategories} variant="destructive">Sim, Apagar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
       </AlertDialog>
      
       <AlertDialog open={!!categoryToEdit} onOpenChange={(open) => !open && setCategoryToEdit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Renomeie a categoria. Todos os produtos associados serão atualizados.
            </AlertDialogDescription>
            <div className="pt-4">
                <Label htmlFor="category-name-edit">Nome da Categoria</Label>
                <Input 
                    id="category-name-edit"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="mt-2"
                />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditCategory}>Salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adicionar Nova Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Digite o nome para a nova categoria de produtos.
            </AlertDialogDescription>
            <div className="pt-4">
                <Label htmlFor="category-name-add">Nome da Categoria</Label>
                <Input 
                    id="category-name-add"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="mt-2"
                    placeholder="Ex: Pavimento"
                />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewCategoryName('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddCategory}>Adicionar</AlertDialogAction>
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
              <div className='flex items-center gap-4'>
                 <p className="text-sm text-muted-foreground">Gerencie os produtos base do seu catálogo.</p>
                  {selectedProducts.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteSelectedProductsConfirm(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Apagar ({selectedProducts.length})
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                 <AddCatalogProductDialog 
                      categories={sortedCategories.map(c => c.name)}
                      onAdd={handleAddProduct}
                  />
              </div>
            </div>
             <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] px-4">
                       <Checkbox
                        checked={sortedProducts.length > 0 && selectedProducts.length === sortedProducts.length}
                        onCheckedChange={(checked) => handleToggleSelectAllProducts(!!checked)}
                        aria-label="Selecionar tudo"
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsLoading ? (
                     <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                           <Skeleton className="h-6 w-full" />
                        </TableCell>
                    </TableRow>
                  ) : sortedProducts && sortedProducts.length > 0 ? sortedProducts.map(product => (
                    <TableRow key={product.id} data-state={selectedProducts.includes(product.id) && "selected"}>
                       <TableCell className="px-4">
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => handleToggleSelectProduct(product.id, !!checked)}
                          aria-label={`Selecionar ${product.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell className="text-right">{product.price.toFixed(2)} MT</TableCell>
                       <TableCell className="text-right flex items-center justify-end gap-2">
                         <EditCatalogProductDialog 
                            product={product} 
                            categories={sortedCategories.map(c => c.name)}
                            onUpdate={handleUpdateProduct}
                         />
                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setProductToDelete(product)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                       </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        Nenhum produto base no catálogo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="categories" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">Gerencie as categorias de produtos.</p>
                 {selectedCategories.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteSelectedCategoriesConfirm(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Apagar ({selectedCategories.length})
                  </Button>
                )}
              </div>
              <Button size="sm" onClick={() => setShowAddCategoryDialog(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Categoria
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px] px-4">
                            <Checkbox
                                checked={sortedCategories.length > 0 && selectedCategories.length === sortedCategories.length}
                                onCheckedChange={(checked) => handleToggleSelectAllCategories(!!checked)}
                                aria-label="Selecionar todas as categorias"
                            />
                        </TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                 {categoriesLoading ? (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                           <Skeleton className="h-6 w-1/2 mx-auto" />
                        </TableCell>
                    </TableRow>
                 ) : sortedCategories.length > 0 ? sortedCategories.map(category => (
                  <TableRow key={category.id} data-state={selectedCategories.includes(category.id) && "selected"}>
                    <TableCell className="px-4">
                       <Checkbox
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={(checked) => handleToggleSelectCategory(category.id, !!checked)}
                          aria-label={`Selecionar ${category.name}`}
                        />
                    </TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditingCategory(category)}>
                            <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCategoryToDelete(category)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={3} className="p-4 text-center text-muted-foreground h-24">Nenhuma categoria encontrada.</TableCell>
                    </TableRow>
                )}
              </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="import" className="mt-4">
            <DataImporter />
        </TabsContent>

      </Tabs>
    </>
  );
}
