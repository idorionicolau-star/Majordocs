
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
  const { companyData, updateCompany } = useContext(InventoryContext) || {};
  const { toast } = useToast();

  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const isMultiLocation = companyData?.isMultiLocation || false;
  const locations = companyData?.locations || [];

  const handleAddLocation = async () => {
    if (!newLocationName.trim() || !updateCompany) return;
    const newLocation: Location = { id: uuidv4(), name: newLocationName.trim() };
    const updatedLocations = [...locations, newLocation];
    await updateCompany({ locations: updatedLocations });
    setNewLocationName('');
    toast({ title: 'Localização Adicionada' });
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation || !newLocationName.trim() || !updateCompany) return;
    const updatedLocations = locations.map(l => l.id === editingLocation.id ? { ...l, name: newLocationName.trim() } : l);
    await updateCompany({ locations: updatedLocations });
    setEditingLocation(null);
    setNewLocationName('');
    toast({ title: 'Localização Atualizada' });
  };

  const handleToggleMultiLocation = async (checked: boolean) => {
    if (updateCompany) {
      await updateCompany({ isMultiLocation: checked });
      toast({ title: checked ? 'Modo Multi-Localização Ativado' : 'Modo Multi-Localização Desativado' });
    }
  };

  // No deletion in locations manager

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
