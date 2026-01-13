
"use client";

import { useState, useContext } from "react";
import { useToast } from "@/hooks/use-toast";
import { UsersDataTable } from "@/components/users/data-table";
import { columns } from "@/components/users/columns";
import { AddEmployeeDialog } from "@/components/users/add-employee-dialog";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { Employee, ModulePermission, PermissionLevel } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase, getFirebaseAuth } from "@/firebase";
import { collection, addDoc, doc, deleteDoc, getDocs, query, where, updateDoc, setDoc, runTransaction } from "firebase/firestore";
import { allPermissions } from "@/lib/data";
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
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";
import { initializeApp, deleteApp, FirebaseApp } from "firebase/app";


// Helper function to create a temporary, secondary Firebase app instance.
const createSecondaryApp = (): FirebaseApp => {
  const appName = `secondary-auth-app-${Date.now()}`;
  return initializeApp(firebaseConfig, appName);
};


export default function UsersPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const mainAuth = getFirebaseAuth();
  const { companyId, user, loading, companyData } = useContext(InventoryContext) || {};
  const isAdmin = user?.role === 'Admin';

  const employeesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/employees`);
  }, [firestore, companyId]);
  
  const { data: employees, isLoading: employeesLoading } = useCollection<Employee>(employeesCollectionRef);
  
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const handleAddEmployee = async (employeeData: Omit<Employee, 'id' | 'companyId' | 'email'> & {email: string}) => {
    if (!firestore || !companyId || !companyData) return;

    const safeCompanyName = (companyData.name || "company").toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '');
    const fullEmail = `${employeeData.email}@${safeCompanyName}.com`;

    const secondaryApp = createSecondaryApp();
    const secondaryAuth = getAuth(secondaryApp);

    try {
      // 1. Create user in the secondary Firebase Auth instance
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, fullEmail, employeeData.password!);
      const newUserId = userCredential.user.uid;

      // 2. Run transaction to create both employee and user map documents
       await runTransaction(firestore, async (transaction) => {
        const permissionsToSet = employeeData.role === 'Admin' 
            ? allPermissions.reduce((acc, p) => ({...acc, [p.id]: 'write' as PermissionLevel}), {} as Record<ModulePermission, PermissionLevel>) 
            : employeeData.permissions;

        // The object to save in the company's employee subcollection. Note: NO password.
        const employeeForFirestore: Omit<Employee, 'id' | 'password'> = {
          username: employeeData.username,
          email: fullEmail,
          role: employeeData.role,
          companyId: companyId,
          permissions: permissionsToSet
        };
        
        // Path to the detailed employee document
        const employeeDocRef = doc(firestore, `companies/${companyId}/employees`, newUserId);
        transaction.set(employeeDocRef, employeeForFirestore);

        // Path to the user map document
        const userMapDocRef = doc(firestore, `users/${newUserId}`);
        transaction.set(userMapDocRef, { companyId: companyId });
       });


      toast({
        title: "Funcionário Adicionado",
        description: `O funcionário "${employeeData.username}" com o email "${fullEmail}" foi adicionado.`,
      });

    } catch (error: any) {
      let message = "Ocorreu um erro ao criar o funcionário.";
      if (error.code === 'auth/email-already-in-use') {
        message = `O email "${fullEmail}" já está a ser utilizado por outra conta.`;
      } else if (error.code === 'auth/weak-password') {
        message = "A senha é demasiado fraca. Use pelo menos 6 caracteres.";
      }
      toast({
        variant: "destructive",
        title: "Erro ao Adicionar Funcionário",
        description: message,
      });
      console.error("Erro ao adicionar funcionário: ", error);
    } finally {
        // Clean up the secondary app
        await deleteApp(secondaryApp);
    }
  };

  const handleUpdateEmployee = async (employee: Employee) => {
    if (!firestore || !companyId || !employee.id) return;
    
    const employeeDocRef = doc(firestore, `companies/${companyId}/employees`, employee.id);
    
    const { id, companyId: _, password, ...updateData } = employee;
    
    await updateDoc(employeeDocRef, updateData);
    
    toast({
      title: "Funcionário Atualizado",
      description: `As informações de "${employee.username}" foram atualizadas.`,
    });
  };

  const handleDeleteEmployee = async () => {
    if (employeeToDelete && employeeToDelete.id && firestore && companyId) {
      // Deleting the user from Firestore. Deleting from Auth should be done via a Cloud Function for security.
      const employeeDocRef = doc(firestore, `companies/${companyId}/employees`, employeeToDelete.id);
      await deleteDoc(employeeDocRef);

      const userMapDocRef = doc(firestore, `users`, employeeToDelete.id);
      await deleteDoc(userMapDocRef);

      toast({
        title: "Funcionário Removido",
        description: `O funcionário "${employeeToDelete.username}" foi removido da base de dados.`,
      });
      setEmployeeToDelete(null);
    }
  };

  if (loading || employeesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
        <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação irá remover permanentemente o funcionário "{employeeToDelete?.username}". A conta de autenticação terá de ser removida manualmente na consola Firebase.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteEmployee}>Remover</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-headline font-bold">Gestão de Funcionários</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">
                    Adicione, edite e remova funcionários do sistema.
                </p>
            </div>
            {isAdmin && <AddEmployeeDialog onAddEmployee={handleAddEmployee} />}
        </div>
      
        <UsersDataTable 
            columns={columns({
                onDelete: (employee) => setEmployeeToDelete(employee),
                onUpdate: handleUpdateEmployee,
                currentUserId: user?.id,
                isAdmin: isAdmin,
                companyName: companyData?.name || null
            })} 
            data={employees || []} 
        />
    </div>
  );
}
