
"use client";

import { useState, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InventoryContext } from '@/context/inventory-context';
import type { Location } from '@/lib/types';
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
import { v4 as uuidv4 } from 'uuid';

export function LocationsManager() {
  const { companyData, updateCompany, confirmAction } = useContext(InventoryContext) || {};
  const { toast } = useToast();

  const isMultiLocation = companyData?.isMultiLocation || false;
  const locations = companyData?.locations || [];

  const [newLocationName, setNewLocationName] = useState('');
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const handleToggleMultiLocation = (checked: boolean) => {
    if (updateCompany) {
      updateCompany({ isMultiLocation: checked });
      toast({
        title: `Multi-Localização ${checked ? 'Ativado' : 'Desativado'}`,
        description: checked ? 'Pode agora gerir o stock em várias localizações.' : 'Todo o stock será gerido num único local.',
      });
    }
  };

  const handleAddLocation = () => {
    if (!newLocationName.trim()) {
      toast({ variant: 'destructive', title: 'Nome inválido' });
      return;
    }
    if (locations && locations.find(l => l.name.toLowerCase() === newLocationName.trim().toLowerCase())) {
      toast({ variant: 'destructive', title: 'Localização já existe' });
      return;
    }

    if (updateCompany) {
      const newLocation = { id: uuidv4(), name: newLocationName.trim() };
      const updatedLocations = [...locations, newLocation];
      updateCompany({ locations: updatedLocations });
      setNewLocationName('');
      toast({ title: 'Localização Adicionada' });
    }
  };

  const handleUpdateLocation = () => {
    if (!editingLocation || !newLocationName.trim()) return;
    if (locations && locations.find(l => l.name.toLowerCase() === newLocationName.trim().toLowerCase() && l.id !== editingLocation.id)) {
      toast({ variant: 'destructive', title: 'Localização já existe' });
      return;
    }

    if (updateCompany) {
      const updatedLocations = locations.map(l => l.id === editingLocation.id ? { ...l, name: newLocationName.trim() } : l);
      updateCompany({ locations: updatedLocations });
      setEditingLocation(null);
      setNewLocationName('');
      toast({ title: 'Localização Atualizada' });
    }
  };

  const handleDeleteLocation = (location: Location) => {
    if (confirmAction && updateCompany) {
      confirmAction(async () => {
        const updatedLocations = locations.filter(l => l.id !== location.id);
        await updateCompany({ locations: updatedLocations });
        toast({ title: 'Localização Removida' });
      }, "Remover Localização", `Tem a certeza que deseja remover permanentemente a localização "${location.name}"?`);
    }
  };

  return (
    <div className="space-y-6">
      <AlertDialog open={!!editingLocation} onOpenChange={() => setEditingLocation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar Localização</AlertDialogTitle>
            <div className="pt-4">
              <Label htmlFor="location-name-edit">Nome da Localização</Label>
              <Input
                id="location-name-edit"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                className="mt-2"
              />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewLocationName('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateLocation}>Salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



      <div className="flex items-center space-x-2">
        <Switch
          id="multi-location-switch"
          checked={isMultiLocation}
          onCheckedChange={handleToggleMultiLocation}
        />
        <Label htmlFor="multi-location-switch">Ativar modo Multi-Localização</Label>
      </div>

      {isMultiLocation && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium">Gerir Localizações</h4>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nome da nova localização"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
            />
            <Button onClick={handleAddLocation}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <div className="rounded-md border">
            <ul className="divide-y">
              {locations && locations.length > 0 ? locations.map(location => (
                <li key={location.id} className="flex items-center justify-between p-3">
                  <span className="font-medium">{location.name}</span>
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingLocation(location); setNewLocationName(location.name); }}>
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteLocation(location)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              )) : (
                <li className="p-4 text-center text-muted-foreground">Nenhuma localização adicionada.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
