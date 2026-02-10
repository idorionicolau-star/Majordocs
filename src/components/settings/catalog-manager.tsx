"use client";

import { useState, useEffect, useContext, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Trash2, Edit, Search, ChevronsDown } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import { EditCatalogProductDialog } from './edit-catalog-product-dialog';
import { InventoryContext } from '@/context/inventory-context';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, setDoc, deleteDoc, updateDoc, collection, writeBatch, query, getDocs, where, addDoc } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { AddCatalogProductDialog } from './add-catalog-product-dialog';
import { initialCatalog } from '@/lib/data';
import { DataImporter } from './data-importer';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';
import { useDynamicPlaceholder } from '@/hooks/use-dynamic-placeholder';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'> & { id: string };
type CatalogCategory = { id: string; name: string };
type ProductImportData = Omit<CatalogProduct, 'id'>;


export function CatalogManager() {
  const { toast } = useToast();
  const inventoryContext = useContext(InventoryContext);
  const firestore = useFirestore();

  const { companyId } = inventoryContext || {};

  const [activeTab, setActiveTab] = useState("categories");
  const [highlightProductsTab, setHighlightProductsTab] = useState(false);

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [currentProductPage, setCurrentProductPage] = useState(1);
  const [currentCategoryPage, setCurrentCategoryPage] = useState(1);
  const itemsPerPage = 5;

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

  const [categoryToEdit, setCategoryToEdit] = useState<CatalogCategory | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const categoryPlaceholder = useDynamicPlaceholder('category', showAddCategoryDialog);

  // Track if the catalog was empty on initial load
  const wasCatalogEmpty = useMemo(() => !categoriesLoading && categories?.length === 0, [categories, categoriesLoading]);

  useEffect(() => {
    if (activeTab === 'products') {
      setHighlightProductsTab(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setSelectedProducts([]);
  }, [products]);

  useEffect(() => {
    setSelectedCategories([]);
  }, [categories]);

  useEffect(() => {
    setCurrentProductPage(1);
    setCurrentCategoryPage(1);
  }, [searchQuery]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [products, searchQuery]);

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [categories, searchQuery]);

  // Early return after all Hooks
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

      // Only highlight if it was the very first category
      if (wasCatalogEmpty) {
        setHighlightProductsTab(true);
      }

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
    } catch (e) {
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
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar a categoria.' });
    }

    setCategoryToEdit(null);
    setNewCategoryName('');
  };

  const startEditingCategory = (category: CatalogCategory) => {
    setCategoryToEdit(category);
    setNewCategoryName(category.name);
  }

  const totalProductPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentProductPage - 1) * itemsPerPage, currentProductPage * itemsPerPage);

  const isAllProductsSelected = paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProducts.includes(p.id));

  const handleToggleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleToggleSelectAllProducts = (checked: boolean) => {
    if (checked) {
      const currentPageIds = paginatedProducts.map(p => p.id);
      setSelectedProducts(prev => Array.from(new Set([...prev, ...currentPageIds])));
    } else {
      const currentPageIds = paginatedProducts.map(p => p.id);
      setSelectedProducts(prev => prev.filter(id => !currentPageIds.includes(id)));
    }
  };

  const handleUpdateProduct = async (productId: string, updatedData: Partial<CatalogProduct>) => {
    if (!firestore || !companyId) return;
    try {
      const productRef = doc(firestore, `companies/${companyId}/catalogProducts`, productId);
      await updateDoc(productRef, updatedData);
      toast({ title: 'Produto Atualizado' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o produto.' });
    }
  };

  const totalCategoryPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const paginatedCategories = filteredCategories.slice((currentCategoryPage - 1) * itemsPerPage, currentCategoryPage * itemsPerPage);

  const isAllCategoriesSelected = paginatedCategories.length > 0 && paginatedCategories.every(c => selectedCategories.includes(c.id));

  const handleToggleSelectCategory = (categoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, categoryId]);
    } else {
      setSelectedCategories(prev => prev.filter(id => id !== categoryId));
    }
  };

  const handleToggleSelectAllCategories = (checked: boolean) => {
    if (checked) {
      const currentPageIds = paginatedCategories.map(c => c.id);
      setSelectedCategories(prev => Array.from(new Set([...prev, ...currentPageIds])));
    } else {
      const currentPageIds = paginatedCategories.map(c => c.id);
      setSelectedCategories(prev => prev.filter(id => !currentPageIds.includes(id)));
    }
  };

  const handleBulkImport = async (importedProducts: any[]) => {
    if (!catalogProductsCollectionRef || !firestore) return;
    toast({ title: 'A importar produtos...' });
    try {
      const batch = writeBatch(firestore);
      importedProducts.forEach(prod => {
        const newDocRef = doc(catalogProductsCollectionRef);
        batch.set(newDocRef, prod);
      });
      await batch.commit();
      toast({ title: 'Importação Concluída', description: `${importedProducts.length} produtos importados.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro na importação.' });
    }
  };

  return (
    <>
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
            <AlertDialogCancel onClick={() => setNewCategoryName('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditCategory}>Salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog >

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
                placeholder={categoryPlaceholder}
              />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewCategoryName('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddCategory}>Adicionar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="categories" className="mt-6">
        <div className="relative mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="products" className={cn(highlightProductsTab && 'animate-shake')}>Produtos</TabsTrigger>
            <TabsTrigger value="import">Importar</TabsTrigger>
          </TabsList>
          {highlightProductsTab && (
            <div className="absolute top-[-24px] left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce-down pointer-events-none">
              <ChevronsDown className="h-6 w-6 text-primary" strokeWidth={2.5} />
            </div>
          )}
        </div>

        <div className="relative mt-4">

          <Input
            placeholder="Pesquisar no catálogo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}

          />
        </div>

        <TabsContent value="products" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className='flex items-center gap-4'>
                <p className="text-sm text-muted-foreground">A gerir {products?.length || 0} produtos base do catálogo.</p>
              </div>
              <div className="flex items-center gap-2">
                <AddCatalogProductDialog
                  categories={categories?.map(c => c.name) || []}
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
                        checked={isAllProductsSelected}
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
                  ) : paginatedProducts && paginatedProducts.length > 0 ? paginatedProducts.map(product => (
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
                          categories={categories?.map(c => c.name) || []}
                          onUpdate={(updatedProduct) => handleUpdateProduct(product.id, updatedProduct)}
                        />
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
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                {selectedProducts.length} de{" "}
                {filteredProducts.length} produto(s) selecionados.
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  Página {currentProductPage} de {totalProductPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentProductPage(p => p - 1)}
                  disabled={currentProductPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentProductPage(p => p + 1)}
                  disabled={currentProductPage >= totalProductPages}
                >
                  Próximo
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">A gerir {categories?.length || 0} categorias de produtos.</p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddCategoryDialog(true)}
                className={cn((!categories || categories.length === 0) && "animate-shake")}
              >
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
                        checked={isAllCategoriesSelected}
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
                  ) : paginatedCategories.length > 0 ? paginatedCategories.map(category => (
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
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                {selectedCategories.length} de{" "}
                {filteredCategories.length} categoria(s) selecionadas.
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  Página {currentCategoryPage} de {totalCategoryPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentCategoryPage(p => p - 1)}
                  disabled={currentCategoryPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentCategoryPage(p => p + 1)}
                  disabled={currentCategoryPage >= totalCategoryPages}
                >
                  Próximo
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <DataImporter onImport={handleBulkImport} />
        </TabsContent>

      </Tabs>
    </>
  );
}
