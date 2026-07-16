"use client";

import { useState, useEffect, useContext } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { useFirestore } from '@/firebase/provider';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, ShieldAlert, CheckCircle, Clock, AlertOctagon } from 'lucide-react';
import { Company } from '@/lib/types';

const ALLOWED_EMAILS = ['digitalwarriorguru@gmail.com', 'idorionicolau@gmail.com'];

export default function SubscriptionsAdminPage() {
  const inventoryContext = useContext(InventoryContext);
  const firestore = useFirestore();
  const { toast } = useToast();

  const user = inventoryContext?.user;
  const firebaseUser = inventoryContext?.firebaseUser;
  const loadingContext = inventoryContext?.loading;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Checks access based on currently logged in user email
  const userEmail = firebaseUser?.email || user?.email || "";
  const isAuthorized = ALLOWED_EMAILS.includes(userEmail.toLowerCase().trim());

  useEffect(() => {
    if (!isAuthorized || !firestore) return;

    async function fetchCompanies() {
      try {
        setLoadingCompanies(true);
        const companiesRef = collection(firestore!, 'companies');
        const querySnapshot = await getDocs(companiesRef);
        const list: Company[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Company);
        });
        setCompanies(list);
      } catch (error: any) {
        console.error("Error loading companies list:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar empresas",
          description: "Verifique se a sua conta Firestore tem a permissão 'superAdmin' ativada.",
        });
      } finally {
        setLoadingCompanies(false);
      }
    }

    fetchCompanies();
  }, [firestore, isAuthorized, toast]);

  const handleUpdateCompany = async (
    companyId: string, 
    status: Company['status'], 
    trialEndsAt: string, 
    subscriptionEndsAt: string
  ) => {
    if (!firestore) return;
    try {
      setUpdatingId(companyId);
      const companyDocRef = doc(firestore, 'companies', companyId);
      
      const updateData: Partial<Company> = {
        status,
        trialEndsAt: trialEndsAt || "",
        subscriptionEndsAt: subscriptionEndsAt || ""
      };

      await updateDoc(companyDocRef, updateData);
      
      // Update local state
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, ...updateData } : c));
      
      toast({
        title: "Alterações salvas",
        description: "Os dados da subscrição foram atualizados com sucesso.",
      });
    } catch (e: any) {
      console.error("Failed to update company subscription:", e);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: e.message || "Não foi possível atualizar a subscrição."
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // 1. Loading state
  if (loadingContext) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">A verificar permissões...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthorized state
  if (!isAuthorized) {
    return (
      <div className="container mx-auto py-8 max-w-md mt-10">
        <Card className="border-destructive/20 bg-destructive/5 dark:bg-destructive/10">
          <CardHeader className="text-center">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle className="text-xl">Acesso Negado</CardTitle>
            <CardDescription>
              Apenas os administradores do sistema têm acesso a esta página de gestão de subscrições.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            O seu utilizador atual (<strong>{userEmail || 'Convidado'}</strong>) não está autorizado.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl md:text-3xl font-headline font-[900] text-slate-900 dark:text-white tracking-tighter">
          Gestão de Subscrições (Admin)
        </h1>
        <p className="text-muted-foreground">
          Ative, suspenda ou configure os períodos de teste (Trial) de todas as empresas no sistema.
        </p>
      </div>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Empresas Registadas
          </CardTitle>
          <CardDescription>
            Defina o status e as datas de término para cada empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCompanies ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhuma empresa encontrada ou erro de permissão no Firestore.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Término do Trial (AAAA-MM-DD)</TableHead>
                    <TableHead>Término da Subscrição (AAAA-MM-DD)</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <CompanyRow 
                      key={company.id} 
                      company={company} 
                      isUpdating={updatingId === company.id}
                      onSave={(status, trial, sub) => handleUpdateCompany(company.id, status, trial, sub)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Inner component to manage row-level editing states easily
function CompanyRow({ 
  company, 
  isUpdating,
  onSave 
}: { 
  company: Company; 
  isUpdating: boolean;
  onSave: (status: Company['status'], trial: string, sub: string) => void;
}) {
  const [status, setStatus] = useState<Company['status']>(company.status || 'trial');
  const [trialEndsAt, setTrialEndsAt] = useState(company.trialEndsAt || '');
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState(company.subscriptionEndsAt || '');

  const hasChanges = 
    status !== company.status || 
    trialEndsAt !== (company.trialEndsAt || '') || 
    subscriptionEndsAt !== (company.subscriptionEndsAt || '');

  return (
    <TableRow>
      <TableCell className="font-semibold">
        <div className="flex flex-col">
          <span>{company.name}</span>
          <span className="text-[10px] text-muted-foreground font-mono">{company.id}</span>
        </div>
      </TableCell>
      <TableCell>
        <Select 
          value={status} 
          onValueChange={(val: any) => setStatus(val)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">
              <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <CheckCircle className="h-3.5 w-3.5" /> Ativo
              </span>
            </SelectItem>
            <SelectItem value="trial">
              <span className="flex items-center gap-1.5 text-blue-500 font-medium">
                <Clock className="h-3.5 w-3.5" /> Trial
              </span>
            </SelectItem>
            <SelectItem value="suspended">
              <span className="flex items-center gap-1.5 text-destructive font-semibold">
                <AlertOctagon className="h-3.5 w-3.5" /> Suspenso
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input 
          type="date" 
          value={trialEndsAt} 
          onChange={(e) => setTrialEndsAt(e.target.value)}
          className="w-40 font-mono"
        />
      </TableCell>
      <TableCell>
        <Input 
          type="date" 
          value={subscriptionEndsAt} 
          onChange={(e) => setSubscriptionEndsAt(e.target.value)}
          className="w-40 font-mono"
        />
      </TableCell>
      <TableCell className="text-right">
        <Button 
          size="sm" 
          disabled={!hasChanges || isUpdating}
          onClick={() => onSave(status, trialEndsAt, subscriptionEndsAt)}
        >
          {isUpdating ? 'A Guardar...' : 'Guardar'}
        </Button>
      </TableCell>
    </TableRow>
  );
}
