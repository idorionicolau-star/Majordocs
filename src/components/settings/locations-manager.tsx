
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Location } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

const locationSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
});

export function LocationsManager() {
  const [isMultiLocation, setIsMultiLocation] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const multiLocationEnabled = localStorage.getItem('majorstockx-multi-location-enabled') === 'true';
      setIsMultiLocation(multiLocationEnabled);

      const storedLocations = localStorage.getItem('majorstockx-locations');
      if (storedLocations) {
        setLocations(JSON.parse(storedLocations));
      } else if (multiLocationEnabled) {
        // If multi-location is enabled but no locations are stored, create a default one
        const defaultLocation = { id: `loc-${Date.now()}`, name: 'Principal' };
        setLocations([defaultLocation]);
        localStorage.setItem('majorstockx-locations', JSON.stringify([defaultLocation]));
      }
    }
  }, []);

  const handleToggleMultiLocation = (enabled: boolean) => {
    setIsMultiLocation(enabled);
    localStorage.setItem('majorstockx-multi-location-enabled', enabled.toString());

    if (enabled && locations.length === 0) {
      const defaultLocation = { id: `loc-${Date.now()}`, name: 'Principal' };
      setLocations([defaultLocation]);
      localStorage.setItem('majorstockx-locations', JSON.stringify([defaultLocation]));
      toast({
        title: 'Modo Multi-Localização Ativado',
        description: 'Uma localização padrão "Principal" foi criada.',
      });
    } else {
       toast({
        title: enabled ? 'Modo Multi-Localização Ativado' : 'Modo Multi-Localização Desativado',
      });
    }
    // Force a reload to apply changes across the app
    window.location.reload();
  };

  const handleAddLocation = (values: z.infer<typeof locationSchema>) => {
    const newLocation: Location = {
      id: `loc-${Date.now()}`,
      name: values.name,
    };
    const updatedLocations = [...locations, newLocation];
    setLocations(updatedLocations);
    localStorage.setItem('majorstockx-locations', JSON.stringify(updatedLocations));
    toast({
      title: 'Localização Adicionada',
      description: `A localização "${values.name}" foi criada com sucesso.`,
    });
    form.reset();
    setIsAddDialogOpen(false);
  };
  
  const confirmDeleteLocation = () => {
    if (locationToDelete) {
      // In a real app, you would check if there is stock or transactions associated
      // with this location before allowing deletion.
      const updatedLocations = locations.filter(loc => loc.id !== locationToDelete.id);
      setLocations(updatedLocations);
      localStorage.setItem('majorstockx-locations', JSON.stringify(updatedLocations));
      toast({
        title: 'Localização Removida',
        description: `A localização "${locationToDelete.name}" foi removida.`,
      });
      setLocationToDelete(null);
    }
  };


  return (
    <div className="space-y-6">
       <AlertDialog open={!!locationToDelete} onOpenChange={(open) => !open && setLocationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isto irá apagar permanentemente a localização
              "{locationToDelete?.name}". Não é possível remover localizações com estoque ou transações associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLocation}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center space-x-2">
        <Switch
          id="multi-location-switch"
          checked={isMultiLocation}
          onCheckedChange={handleToggleMultiLocation}
        />
        <Label htmlFor="multi-location-switch">Ativar Multi-Localizações</Label>
      </div>

      {isMultiLocation && (
        <div className="space-y-4 pt-4 border-t">
          <div className='flex justify-between items-center'>
            <h4 className="font-medium text-lg">Localizações Cadastradas</h4>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Localização
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar Nova Localização</DialogTitle>
                        <DialogDescription>
                            Digite o nome para a nova localização do seu negócio.
                        </DialogDescription>
                    </DialogHeader>
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleAddLocation)} className="space-y-4">
                            <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nome da Localização</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Estaleiro da Matola" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="secondary" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit">Adicionar</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
          </div>
          <div className="rounded-md border">
            <ul className="divide-y">
              {locations.length > 0 ? locations.map(location => (
                <li key={location.id} className="flex items-center justify-between p-3">
                  <span className="text-sm font-medium">{location.name}</span>
                  <div className='flex items-center gap-2'>
                    {/* Edit button could be added here */}
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setLocationToDelete(location)}
                        disabled={locations.length <= 1}
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Apagar</span>
                    </Button>
                  </div>
                </li>
              )) : (
                <li className="p-3 text-sm text-muted-foreground text-center">Nenhuma localização cadastrada.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
