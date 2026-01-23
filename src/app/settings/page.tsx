

"use client";

import { useEffect, useState, useContext, useRef } from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, Building, Book, Palette, User as UserIcon, MapPin, Mail, Check, Code, RefreshCw, Trash2 } from "lucide-react";
import { CatalogManager } from "@/components/settings/catalog-manager";
import { LocationsManager } from "@/components/settings/locations-manager";
import { Button } from "@/components/ui/button";
import { InventoryContext } from "@/context/inventory-context";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { ModulePermission } from "@/lib/types";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/components/theme-provider";
import { themes } from "@/lib/themes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";


const colorOptions = [
  { name: 'Primary', value: 'hsl(var(--primary))', className: 'bg-primary' },
  { name: 'Accent', value: 'hsl(var(--accent))', className: 'bg-accent' },
  { name: 'Destructive', value: 'hsl(var(--destructive))', className: 'bg-destructive' },
  { name: 'Foreground', value: 'hsl(var(--foreground))', className: 'bg-border' },
];

function ProfileTab() {
  const { user, profilePicture, setProfilePicture } = useContext(InventoryContext) || {};
  const { toast } = useToast();
  // Holds the newly selected image before it's saved
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePicture = () => {
    if (selectedImage && setProfilePicture) {
        setProfilePicture(selectedImage);
    }
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  
  const displayImage = selectedImage || profilePicture;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Perfil de Utilizador</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            {displayImage ? <AvatarImage src={displayImage} alt="Foto de Perfil" /> : null}
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
              {user ? getInitials(user.username) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <Label htmlFor="profile-pic-upload">Foto de Perfil</Label>
            <Input id="profile-pic-upload" type="file" accept="image/*" onChange={handleProfilePicChange} className="max-w-xs"/>
            <p className="text-xs text-muted-foreground">Recomendado: 400x400px</p>
          </div>
        </div>
        <div className="flex justify-end">
            <Button onClick={handleSavePicture} disabled={!selectedImage}>
                Salvar foto
            </Button>
        </div>

        <div className="space-y-4 pt-6 border-t">
          <div className="space-y-1">
            <Label>Nome de Utilizador</Label>
            <p className="font-semibold">{user?.username}</p>
          </div>
          <div className="space-y-1">
            <Label>Função</Label>
            <p className="font-semibold">{user?.role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const [isClient, setIsClient] = useState(false);
  const [borderRadius, setBorderRadius] = useState(0.8);
  const inventoryContext = useContext(InventoryContext);
  const { toast } = useToast();
  const { user, clearProductsCollection } = inventoryContext || {};
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { colorTheme, setColorTheme } = useTheme();

  const [companyDetails, setCompanyDetails] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    businessType: 'manufacturer' as 'manufacturer' | 'reseller',
    notificationSettings: {
      email: '',
      onSale: false,
      onCriticalStock: false,
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { companyData, updateCompany } = inventoryContext || {};

  const hasPermission = (permissionId: ModulePermission) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    if (!user.permissions) return false;
    
    const perms = user.permissions;

    if (typeof perms === 'object' && !Array.isArray(perms)) {
      const level = perms[permissionId];
      return level === 'read' || level === 'write';
    }

    if (Array.isArray(perms)) {
       // @ts-ignore
      return perms.includes(permissionId);
    }
    
    return false;
  };
  
  const settingsTabs = [
    { value: 'profile', label: 'Perfil', icon: UserIcon, permission: true },
    { value: 'appearance', label: 'Aparência', icon: Palette, permission: true },
    { value: 'company', label: 'Empresa', icon: Building, permission: hasPermission('settings') },
    { value: 'locations', label: 'Localizações', icon: MapPin, permission: hasPermission('settings') },
    { value: 'catalog', label: 'Catálogo', icon: Book, permission: hasPermission('settings') },
    { value: 'advanced', label: 'Avançado', icon: Code, permission: hasPermission('settings') }
  ].filter(tab => tab.permission);

  useEffect(() => {
    setIsClient(true);
    if (companyData) {
      setCompanyDetails({
        name: companyData.name || '',
        email: companyData.email || '',
        phone: companyData.phone || '',
        address: companyData.address || '',
        taxId: companyData.taxId || '',
        businessType: companyData.businessType || 'manufacturer',
        notificationSettings: {
          email: companyData.notificationSettings?.email || '',
          onSale: companyData.notificationSettings?.onSale || false,
          onCriticalStock: companyData.notificationSettings?.onCriticalStock || false,
        }
      });
    }
  }, [companyData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.substring(1);
      if (hash) {
          setActiveTab(hash);
      }

      const storedRadius = localStorage.getItem('majorstockx-border-radius');
      if (storedRadius) {
        setBorderRadius(parseFloat(storedRadius));
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && isClient) {
      document.documentElement.style.setProperty('--radius', `${borderRadius}rem`);
    }
  }, [borderRadius, isClient]);
  
   useEffect(() => {
    const activeLink = document.getElementById(`tab-trigger-${activeTab}`);
    if (activeLink && scrollRef.current) {
      const scrollArea = scrollRef.current;
      const linkRect = activeLink.getBoundingClientRect();
      const scrollAreaRect = scrollArea.getBoundingClientRect();
      
      const scrollOffset = (linkRect.left - scrollAreaRect.left) - (scrollAreaRect.width / 2) + (linkRect.width / 2);
      
      scrollArea.querySelector('[data-radix-scroll-area-viewport]')?.scrollBy({
        left: scrollOffset,
        behavior: 'smooth',
      });
    }
  }, [activeTab]);

  const handleBorderRadiusChange = (value: number[]) => {
    const newRadius = value[0];
    setBorderRadius(newRadius);
    if (typeof window !== 'undefined') {
      localStorage.setItem('majorstockx-border-radius', newRadius.toString());
    }
  };

  const handleCompanyUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateCompany) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Função de atualização não encontrada.' });
        return;
    }
    setIsSubmitting(true);
    toast({ title: 'A atualizar...', description: 'A guardar os dados da empresa.' });
    await updateCompany(companyDetails);
    toast({ title: 'Sucesso!', description: 'Os dados da empresa foram atualizados.' });
    setIsSubmitting(false);
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === 'notificationSettings.email') {
        setCompanyDetails(prev => ({
            ...prev,
            notificationSettings: {
                ...prev.notificationSettings,
                email: value,
            }
        }));
    } else {
        setCompanyDetails(prev => ({...prev, [id]: value }));
    }
  }

  const handleSwitchChange = (id: 'onSale' | 'onCriticalStock', checked: boolean) => {
    setCompanyDetails(prev => ({
        ...prev,
        notificationSettings: {
            ...prev.notificationSettings,
            [id]: checked,
        }
    }));
  };

  const handleClearProducts = async () => {
    if (clearProductsCollection) {
      toast({ title: "A limpar...", description: "A apagar todos os produtos do inventário no Firestore." });
      await clearProductsCollection();
      toast({ title: "Sucesso!", description: "A coleção de produtos foi limpa." });
    }
    setShowClearConfirm(false);
  };


  if (!isClient) {
    return null; // Or a loading skeleton
  }

  return (
    <>
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível e irá apagar permanentemente **todos** os produtos do seu inventário no Firestore. Não será possível recuperar estes dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearProducts} variant="destructive">
              Sim, apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-[900] text-slate-900 dark:text-white tracking-tighter">Configurações</h1>
        </div>

        <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="hidden md:block">
            <ScrollArea className="w-full whitespace-nowrap" ref={scrollRef}>
              <TabsList className="inline-flex h-auto items-center justify-start rounded-2xl bg-muted p-1.5 text-muted-foreground w-max">
                {settingsTabs.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} id={`tab-trigger-${tab.value}`}>
                    <tab.icon className="mr-2 h-4 w-4" />{tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
          
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>{settingsTabs.find(t => t.value === activeTab)?.label || 'Menu'}</span>
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                {settingsTabs.map(tab => (
                    <DropdownMenuItem key={tab.value} onSelect={() => setActiveTab(tab.value)}>
                        <tab.icon className="mr-2 h-4 w-4" />
                        <span>{tab.label}</span>
                    </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="profile">
            <ProfileTab />
          </TabsContent>
          
          <TabsContent value="appearance">
             <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Aparência</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="theme">Modo de Cor</Label>
                    <ThemeSwitcher />
                  </div>

                   <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="color-theme" className="border-b-0">
                      <AccordionTrigger>
                          <Label>Cor do Tema</Label>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Selecione a cor primária para a aplicação.
                        </p>
                        <div className="grid grid-cols-7 sm:grid-cols-10 gap-2 pt-2">
                          {themes.map((theme) => {
                            const isActive = colorTheme === theme.name;
                            return (
                              <TooltipProvider key={theme.name} delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => setColorTheme(theme.name)}
                                      className={cn(
                                        "h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all",
                                        isActive ? "border-foreground" : "border-transparent"
                                      )}
                                      style={{
                                        backgroundColor: `hsl(${theme.primary.light})`,
                                      }}
                                    >
                                      {isActive && <Check className="h-5 w-5 text-white" />}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{theme.name}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <div className="space-y-2">
                    <Label htmlFor="border-radius">Arredondamento dos Cantos</Label>
                    <p className="text-sm text-muted-foreground">Ajuste o raio das bordas dos elementos.</p>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="border-radius"
                        min={0}
                        max={2}
                        step={0.1}
                        value={[borderRadius]}
                        onValueChange={handleBorderRadiusChange}
                        className="w-[calc(100%-4rem)]"
                      />
                      <span className="w-12 text-right font-mono text-sm text-muted-foreground">
                        {borderRadius.toFixed(1)}rem
                      </span>
                    </div>
                  </div>
                </CardContent>
            </Card>
          </TabsContent>

          {hasPermission('settings') && (
            <>
              <TabsContent value="company">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Detalhes da Empresa</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <form onSubmit={handleCompanyUpdate} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome da Empresa</Label>
                                <Input id="name" value={companyDetails.name} onChange={handleDetailChange} />
                            </div>
                             <div className="space-y-2">
                                <Label>Tipo de Negócio</Label>
                                <Select value={companyDetails.businessType} onValueChange={(value: 'manufacturer' | 'reseller') => setCompanyDetails(prev => ({ ...prev, businessType: value}))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo de negócio" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="manufacturer">Fábrica / Produtor</SelectItem>
                                        <SelectItem value="reseller">Loja / Revendedor</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email de Contacto</Label>
                                <Input id="email" type="email" value={companyDetails.email} onChange={handleDetailChange} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="phone">Telefone</Label>
                                <Input id="phone" value={companyDetails.phone} onChange={handleDetailChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="taxId">NUIT</Label>
                                <Input id="taxId" value={companyDetails.taxId} onChange={handleDetailChange} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Endereço</Label>
                                <Input id="address" value={companyDetails.address} onChange={handleDetailChange} />
                            </div>
                          </div>

                          <div className="space-y-4 pt-6 border-t">
                              <Label className="flex items-center gap-2 font-semibold text-base">
                                  <Mail className="h-5 w-5 text-primary"/>
                                  Notificações por E-mail
                              </Label>
                              <div className="grid gap-4 rounded-2xl border p-4">
                                  <div className="space-y-2">
                                      <Label htmlFor="notificationSettings.email">E-mail de Destino</Label>
                                      <p className="text-sm text-muted-foreground">
                                          O e-mail para receber todos os alertas ativados.
                                      </p>
                                      <Input id="notificationSettings.email" type="email" value={companyDetails.notificationSettings.email} onChange={handleDetailChange} placeholder="ex: gerente@suaempresa.com"/>
                                  </div>
                                  <div className="space-y-3 pt-4">
                                      <h4 className="font-medium text-sm">Ativar alertas para:</h4>
                                      <div className="flex items-center justify-between rounded-md border p-3 bg-background/50">
                                          <Label htmlFor="onCriticalStock" className="cursor-pointer">Stock Crítico</Label>
                                          <Switch
                                              id="onCriticalStock"
                                              checked={companyDetails.notificationSettings.onCriticalStock}
                                              onCheckedChange={(checked) => handleSwitchChange('onCriticalStock', checked)}
                                          />
                                      </div>
                                      <div className="flex items-center justify-between rounded-md border p-3 bg-background/50">
                                          <Label htmlFor="onSale" className="cursor-pointer">Novas Vendas</Label>
                                          <Switch
                                              id="onSale"
                                              checked={companyDetails.notificationSettings.onSale}
                                              onCheckedChange={(checked) => handleSwitchChange('onSale', checked)}
                                          />
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'A guardar...' : 'Salvar Alterações'}
                            </Button>
                          </div>
                      </form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="locations">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Gestão de Localizações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LocationsManager />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="catalog">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Gestor de Catálogo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CatalogManager />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced">
                 <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Ferramentas Avançadas</CardTitle>
                    <CardDescription>Ações de manutenção para corrigir inconsistências nos dados. Use com cuidado.</CardDescription>
                  </CardHeader>
                   <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <h3 className="font-semibold">Recalcular Stock Reservado</h3>
                        <p className="text-sm text-muted-foreground">
                          Sincroniza o stock reservado de todos os produtos com base nas vendas "Pagas" existentes. Útil para corrigir "reservas fantasma".
                        </p>
                        <Button onClick={() => inventoryContext?.recalculateReservedStock()} disabled={inventoryContext?.loading}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Executar Recálculo
                        </Button>
                      </div>
                      
                      <Separator />

                      <div className="space-y-2">
                        <h3 className="font-semibold text-destructive">Limpar Inventário</h3>
                        <p className="text-sm text-muted-foreground">
                          Atenção: Apaga permanentemente todos os produtos do inventário. Utilize apenas se quiser recomeçar do zero.
                        </p>
                         <Button variant="destructive" onClick={() => setShowClearConfirm(true)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Limpar Produtos do Firestore
                         </Button>
                      </div>
                   </CardContent>
                </Card>
              </TabsContent>
            </>
          )}

        </Tabs>
      </div>
    </>
  );
}
