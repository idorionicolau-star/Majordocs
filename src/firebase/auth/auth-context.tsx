
'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Employee } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface AuthContextType {
  user: Employee | null;
  companyId: string | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    // Tenta carregar os dados da sessão do localStorage
    try {
      const storedUser = localStorage.getItem('majorstockx-user');
      const storedCompanyId = localStorage.getItem('majorstockx-company-id');
      if (storedUser && storedCompanyId) {
        setUser(JSON.parse(storedUser));
        setCompanyId(storedCompanyId);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, pass: string): Promise<boolean> => {
    setLoading(true);
    if (!firestore) {
      setLoading(false);
      return false;
    }
    
    // Este é um método de autenticação SIMPLIFICADO e INSEGURO para demonstração.
    // Numa aplicação real, a verificação de senha deve ser feita no backend.
    
    try {
      // 1. Encontrar o ID da empresa pelo nome de utilizador
      // Esta é uma query ineficiente. Numa app real, o utilizador digitaria o ID da empresa.
      const companiesSnapshot = await getDocs(collection(firestore, 'companies'));
      let foundUser: Employee | null = null;
      let foundCompanyId: string | null = null;

      for (const companyDoc of companiesSnapshot.docs) {
        const employeesCollection = collection(firestore, `companies/${companyDoc.id}/employees`);
        const q = query(employeesCollection, where("username", "==", username));
        const userSnapshot = await getDocs(q);

        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data() as Employee;
            // ATENÇÃO: Comparação de senha em plain text. NÃO FAÇA ISTO EM PRODUÇÃO.
            if (userData.password === pass) {
                foundUser = { ...userData, id: userSnapshot.docs[0].id };
                foundCompanyId = companyDoc.id;
                break;
            }
        }
      }

      if (foundUser && foundCompanyId) {
        // Remover a senha do objeto do utilizador antes de guardar no estado/localStorage
        const { password, ...userToStore } = foundUser;

        setUser(userToStore);
        setCompanyId(foundCompanyId);
        localStorage.setItem('majorstockx-user', JSON.stringify(userToStore));
        localStorage.setItem('majorstockx-company-id', foundCompanyId);
        setLoading(false);
        return true;
      } else {
        throw new Error("Credenciais inválidas");
      }
    } catch (error) {
      console.error("Login error: ", error);
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setCompanyId(null);
    localStorage.removeItem('majorstockx-user');
    localStorage.removeItem('majorstockx-company-id');
    router.push('/login');
  };

  const value = { user, companyId, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
