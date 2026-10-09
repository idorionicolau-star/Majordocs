
"use client";

import { useState, useContext, useMemo } from 'react';
import { doc, increment, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { planAssignLocation, unassignedProducts } from '@/lib/assign-location';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Loader2, MapPin } from 'lucide-react';
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
  const { companyData, updateCompany, products, companyId, canEdit, isReadOnly } = useContext(InventoryContext) || ({} as Partial<NonNullable<React.ContextType<typeof InventoryContext>>>);
  const firestore = useFirestore();
  const { toast } = useToast();

  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const isMultiLocation = companyData?.isMultiLocation || false;
  const locations = useMemo(() => companyData?.locations || [], [companyData?.locations]);

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

  // ---- produtos registados antes de activar as localizações: pô-los num local
  // cada linha do inventário junta os documentos iguais (sourceIds): o id usado é o primeiro, e mexe-se em todos
  const rows = useMemo(() => (products || []).map((p) => ({ ...p, id: (p.sourceIds?.[0] || p.id || p.instanceId) as string, ids: p.sourceIds?.length ? p.sourceIds : p.id ? [p.id] : [] })), [products]);
  const unassigned = useMemo(
    () => unassignedProducts(rows, locations.map((l) => l.id)).sort((a, b) => a.name.localeCompare(b.name, 'pt')),
    [rows, locations],
  );
  const [target, setTarget] = useState('');
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState(false);
  const dest = target || locations[0]?.id || '';
  const chosen = unassigned.filter((p) => !skip.has(p.id));

  const assign = async () => {
    if (!firestore || !companyId || !dest || !chosen.length || moving || isReadOnly) return;
    if (canEdit && !canEdit('inventory')) { toast({ variant: 'destructive', title: 'Sem permissão', description: 'Só quem gere o inventário pode mudar o local dos produtos.' }); return; }
    setMoving(true);
    try {
      const plan = planAssignLocation(chosen, rows, dest);
      const idsOf = (id: string) => rows.find((r) => r.id === id)?.ids || [id];
      const at = new Date().toISOString();
      const ref = (id: string) => doc(firestore, `companies/${companyId}/products`, id);
      const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [
        ...plan.moves.flatMap((id) => idsOf(id).map((x) => (b: ReturnType<typeof writeBatch>) => b.update(ref(x), { location: dest, lastUpdated: at }))),
        ...plan.merges.flatMap((m) => [
          (b: ReturnType<typeof writeBatch>) => b.update(ref(m.intoId), { stock: increment(m.stock), reservedStock: increment(m.reserved), lastUpdated: at }),
          ...idsOf(m.fromId).map((x) => (b: ReturnType<typeof writeBatch>) => b.update(ref(x), { stock: 0, reservedStock: 0, deletedAt: at, deletedBy: 'juntado ao mudar de local', lastUpdated: at })),
        ]),
      ];
      for (let i = 0; i < ops.length; i += 200) {
        const b = writeBatch(firestore);
        ops.slice(i, i + 200).forEach((op) => op(b));
        await b.commit();
      }
      const name = locations.find((l) => l.id === dest)?.name || 'o local';
      toast({
        title: `${chosen.length} produto${chosen.length === 1 ? '' : 's'} em ${name}`,
        description: plan.merges.length ? `${plan.merges.length} já existia${plan.merges.length === 1 ? '' : 'm'} lá: o stock foi somado.` : 'Já aparecem nesse local no inventário e nas vendas.',
      });
      setSkip(new Set());
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Não foi possível mudar o local', description: e?.message || 'Tente de novo.' });
    } finally {
      setMoving(false);
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

          {locations.length > 0 && unassigned.length > 0 && (
            <div data-tour="unassigned-products" className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold">{unassigned.length} produto{unassigned.length === 1 ? '' : 's'} sem localização</p>
                  <p className="text-sm text-muted-foreground">Registados antes de activar as localizações. Escolha onde ficam — se já existir lá o mesmo produto, o stock é somado.</p>
                </div>
              </div>
              <ul className="max-h-60 divide-y overflow-y-auto rounded-lg border bg-background text-sm">
                {unassigned.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2">
                      <input type="checkbox" className="h-4 w-4 accent-primary" checked={!skip.has(p.id)}
                        onChange={() => setSkip((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })} />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{p.stock || 0} {p.unit || 'un'}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="assign-target" className="text-sm">Pôr em</Label>
                <select id="assign-target" value={dest} onChange={(e) => setTarget(e.target.value)} className="h-10 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm">
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <Button onClick={assign} disabled={!chosen.length || moving}>
                  {moving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mover {chosen.length}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Pode tirar alguns da lista e pô-los noutro local a seguir.</p>
            </div>
          )}

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
