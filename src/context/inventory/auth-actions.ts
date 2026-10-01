'use client';

import type { ModulePermission, PermissionLevel } from '@/lib/types';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, doc, writeBatch, getDocs, query, where, getDoc } from 'firebase/firestore';
import { allPermissions } from '@/lib/data';
import type { InventoryCore } from './core';

export function useAuthActions(core: InventoryCore) {
  const { auth, toast, firestore } = core;





  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return true;
    } catch (error: any) {
      console.error("Firebase Auth login error:", error);
      let message = "Ocorreu um erro ao fazer login.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Email ou senha inválidos.";
      }
      toast({ variant: 'destructive', title: 'Erro de Login', description: message });
      throw error;
    }
  };


  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Verify if the user exists in our users collection
      if (firestore) {
        const userDoc = await getDoc(doc(firestore, `users/${result.user.uid}`));
        if (!userDoc.exists()) {
          // User authenticated with Google but has no company mapping
          await auth.signOut();
          toast({
            variant: 'destructive',
            title: 'Conta não encontrada',
            description: 'Esta conta Google não está associada a nenhuma empresa. Por favor, faça o registo.'
          });
          return false;
        }
      }

      return true;
    } catch (error: any) {
      console.error("Google Auth login error:", error);
      let message = `Ocorreu um erro ao fazer login com o Google: ${error.message || error.code || 'Desconhecido'}`;
      if (error.code === 'auth/popup-closed-by-user') {
        message = "O login foi cancelado pelo utilizador.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "O login com Google não está activo nas configurações do sistema.";
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        message = "Já existe uma conta com este email. Faça login manualmente (Email/Senha).";
      } else if (error.code === 'auth/popup-blocked') {
        message = "O pop-up de login foi bloqueado. Por favor, permita pop-ups para este site.";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = "Este domínio não está autorizado na Firebase Console para o Google Auth.";
      }
      toast({ variant: 'destructive', title: 'Erro de Login', description: message });
      return false;
    }
  };


  const resetPassword = async (email: string): Promise<void> => {
    try {
      const actionCodeSettings = {
        // URL you want to redirect back to. The domain (www.example.com) for this
        // URL must be whitelisted in the Firebase Console.
        url: window.location.origin + '/login',
        // This must be true.
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      toast({
        title: "E-mail de redefinição enviado",
        description: "Verifique a sua caixa de entrada para redefinir a sua senha.",
      });
    } catch (error: any) {
      console.error("Firebase Auth reset password error:", error);
      let message = "Ocorreu um erro ao enviar o e-mail de redefinição.";
      if (error.code === 'auth/user-not-found') {
        message = "Não encontramos nenhuma conta com este endereço de e-mail.";
      }
      toast({ variant: 'destructive', title: 'Erro', description: message });
      throw error;
    }
  };


  const changePassword = async (currentPass: string, newPass: string): Promise<boolean> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error("Utilizador não autenticado.");
      }

      // Reauthenticate first to satisfy "recent login" requirement
      const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPass);

      toast({
        title: "Senha alterada",
        description: "A sua senha foi alterada com sucesso.",
      });
      return true;
    } catch (error: any) {
      console.error("Firebase Auth change password error:", error);
      let message = "Ocorreu um erro ao alterar a senha.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "A senha atual está incorreta.";
      } else if (error.code === 'auth/weak-password') {
        message = "A nova senha tem de ter no mínimo 6 caracteres.";
      } else if (error.code === 'auth/requires-recent-login') {
        message = "Faça logout e login novamente antes de tentar alterar a senha.";
      }
      toast({ variant: 'destructive', title: 'Erro de Autenticação', description: message });
      return false;
    }
  };


  const registerCompany = async (companyName: string, adminUsername: string, adminEmail: string, adminPass: string, businessType: 'manufacturer' | 'reseller'): Promise<boolean> => {
    if (!firestore) return false;

    try {
      const companiesRef = collection(firestore, 'companies');
      const companyQuery = query(companiesRef, where('name', '==', companyName));
      const existingCompanySnapshot = await getDocs(companyQuery);
      if (!existingCompanySnapshot.empty) {
        throw new Error('Uma empresa com este nome já existe.');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
      const newUserId = userCredential.user.uid;

      const newCompanyRef = doc(companiesRef);

      const adminPermissions = allPermissions.reduce((acc, p) => {
        acc[p.id] = 'write';
        return acc;
      }, {} as Record<ModulePermission, PermissionLevel>);

      const employeesCollectionRef = collection(firestore, `companies/${newCompanyRef.id}/employees`);
      const newEmployeeRef = doc(employeesCollectionRef, newUserId);
      const userMapDocRef = doc(firestore, `users/${newUserId}`);

      const batch = writeBatch(firestore);

      batch.set(newEmployeeRef, {
        username: adminUsername,
        email: adminEmail,
        role: 'Admin',
        companyId: newCompanyRef.id,
        permissions: adminPermissions,
      });

      batch.set(userMapDocRef, { companyId: newCompanyRef.id });

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      batch.set(newCompanyRef, {
        name: companyName,
        ownerId: newUserId,
        isMultiLocation: false,
        locations: [],
        businessType,
        saleCounter: 0,
        status: 'trial',
        trialEndsAt: trialEndsAt.toISOString()
      });

      await batch.commit();

      try {
        const fbToken = await auth.currentUser?.getIdToken();
        await fetch('/api/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${fbToken}`
          },
          body: JSON.stringify({
            to: adminEmail,
            subject: '🎉 Bem-vindo ao MajorStockX!',
            type: 'WELCOME',
            companyName: companyName,
            companyId: newCompanyRef.id,
          }),
        });
      } catch (emailError) {
        console.warn("Falha ao enviar e-mail de boas-vindas, mas o registo foi bem-sucedido:", emailError);
      }

      return true;
    } catch (error: any) {
      console.error('Registration error: ', error);
      let message = 'Ocorreu um erro inesperado durante o registo.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Este endereço de email já está a ser utilizado.';
      } else if (error.message.includes('Uma empresa com este nome')) {
        message = error.message;
      }
      toast({ variant: 'destructive', title: 'Erro no Registo', description: message });
      return false;
    }
  };


  const registerCompanyWithGoogle = async (companyName: string, businessType: 'manufacturer' | 'reseller'): Promise<boolean> => {
    if (!firestore) return false;

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const newUserId = userCredential.user.uid;
      const adminEmail = userCredential.user.email || '';
      const adminUsername = userCredential.user.displayName || 'Admin';

      // Check if user already has a company
      const existingUserMap = await getDoc(doc(firestore, `users/${newUserId}`));
      if (existingUserMap.exists()) {
        await auth.signOut();
        toast({
          variant: 'destructive',
          title: 'Erro no Registo',
          description: 'Esta conta Google já está associada a uma empresa. Por favor, faça login em vez de se registar.'
        });
        return false;
      }

      const companiesRef = collection(firestore, 'companies');
      const companyQuery = query(companiesRef, where('name', '==', companyName));
      const existingCompanySnapshot = await getDocs(companyQuery);
      if (!existingCompanySnapshot.empty) {
        await auth.signOut();
        throw new Error('Uma empresa com este nome já existe.');
      }

      const newCompanyRef = doc(companiesRef);

      const adminPermissions = allPermissions.reduce((acc, p) => {
        acc[p.id] = 'write';
        return acc;
      }, {} as Record<ModulePermission, PermissionLevel>);

      const employeesCollectionRef = collection(firestore, `companies/${newCompanyRef.id}/employees`);
      const newEmployeeRef = doc(employeesCollectionRef, newUserId);
      const userMapDocRef = doc(firestore, `users/${newUserId}`);

      const batch = writeBatch(firestore);

      batch.set(newEmployeeRef, {
        username: adminUsername,
        email: adminEmail,
        role: 'Admin',
        companyId: newCompanyRef.id,
        permissions: adminPermissions,
      });

      batch.set(userMapDocRef, { companyId: newCompanyRef.id });

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      batch.set(newCompanyRef, {
        name: companyName,
        ownerId: newUserId,
        isMultiLocation: false,
        locations: [],
        businessType,
        saleCounter: 0,
        status: 'trial',
        trialEndsAt: trialEndsAt.toISOString()
      });

      await batch.commit();

      try {
        const fbToken = await auth.currentUser?.getIdToken();
        await fetch('/api/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${fbToken}`
          },
          body: JSON.stringify({
            to: adminEmail,
            subject: '🎉 Bem-vindo ao MajorStockX!',
            type: 'WELCOME',
            companyName: companyName,
            companyId: newCompanyRef.id,
          }),
        });
      } catch (emailError) {
        console.warn("Falha ao enviar e-mail de boas-vindas, mas o registo foi bem-sucedido:", emailError);
      }

      return true;
    } catch (error: any) {
      console.error('Registration with Google error: ', error);
      let message = `Erro inesperado: ${error.message || error.code || 'Desconhecido'}`;
      if (error.code === 'auth/popup-closed-by-user') {
        message = 'Registo com Google cancelado.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "O login com Google não está activo nas configurações do sistema.";
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        message = "Já existe uma conta com este email. Faça login manualmente (Email/Senha).";
      } else if (error.code === 'auth/popup-blocked') {
        message = "O pop-up de login foi bloqueado. Por favor, permita pop-ups para este site.";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = "Este domínio não está autorizado na Firebase Console para o Google Auth.";
      } else if (error.message?.includes('Uma empresa com este nome')) {
        message = error.message;
      }
      toast({ variant: 'destructive', title: 'Erro no Registo', description: message });
      return false;
    }
  };
  return { login, loginWithGoogle, resetPassword, changePassword, registerCompany, registerCompanyWithGoogle };
}

export type AuthActions = ReturnType<typeof useAuthActions>;
