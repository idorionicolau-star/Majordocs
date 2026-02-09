

"use client";

import { useState, useContext } from "react";
import { useToast } from "@/hooks/use-toast";
import { UsersDataTable } from "@/components/users/data-table";
import { columns } from "@/components/users/columns";
import { AddEmployeeDialog } from "@/components/users/add-employee-dialog";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { Employee, ModulePermission, PermissionLevel } from "@/lib/types";
import { useFirestore, getFirebaseAuth, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
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
import { EmployeeCard } from "@/components/users/employee-card";
import { Card } from "@/components/ui/card";


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

  const handleAddEmployee = async (employeeData: Omit<Employee, 'id' | 'companyId' | 'email'> & { email: string }) => {
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
          ? allPermissions.reduce((acc, p) => ({ ...acc, [p.id]: 'write' as PermissionLevel }), {} as Record<ModulePermission, PermissionLevel>)
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
    // Removal disabled
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
            <AlertDialogAction onClick={handleDeleteEmployee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4">
        {isAdmin && <AddEmployeeDialog onAddEmployee={handleAddEmployee} />}
      </div>

      <div className="hidden md:block">
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
      <div className="md:hidden space-y-3">
        {(employees && employees.length > 0) ? (
          employees.map(employee => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onDelete={setEmployeeToDelete}
              onUpdate={handleUpdateEmployee}
              currentUserId={user?.id}
              isAdmin={isAdmin}
            />
          ))
        ) : (
          <Card className="text-center py-12 text-muted-foreground">
            Nenhum funcionário encontrado.
          </Card>
        )}
      </div>
    </div>
  );
}
