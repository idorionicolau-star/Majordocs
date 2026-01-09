
'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Employee, Company } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, addDoc, doc } from 'firebase/firestore';

interface AuthContextType {
  user: Employee | null;
  companyId: string | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  registerCompany: (companyName: string, adminUsername: string, adminPass: string) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
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
    
    try {
      const companiesSnapshot = await getDocs(collection(firestore, 'companies'));
      let foundUser: Employee | null = null;
      let foundCompanyId: string | null = null;

      for (const companyDoc of companiesSnapshot.docs) {
        const employeesCollection = collection(firestore, `companies/${companyDoc.id}/employees`);
        const q = query(employeesCollection, where("username", "==", username));
        const userSnapshot = await getDocs(q);

        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data() as Employee;
            if (userData.password === pass) { // WARNING: Insecure password check
                foundUser = { ...userData, id: userSnapshot.docs[0].id };
                foundCompanyId = companyDoc.id;
                break;
            }
        }
      }

      if (foundUser && foundCompanyId) {
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

  const registerCompany = async (companyName: string, adminUsername: string, adminPass: string): Promise<boolean> => {
    if (!firestore) return false;

    // Check if username already exists across all companies (inefficient but necessary for this model)
     const companiesSnapshot = await getDocs(collection(firestore, 'companies'));
     for (const companyDoc of companiesSnapshot.docs) {
        const employeesCollection = collection(firestore, `companies/${companyDoc.id}/employees`);
        const q = query(employeesCollection, where("username", "==", adminUsername));
        const userSnapshot = await getDocs(q);
        if (!userSnapshot.empty) {
            console.error("Username already exists");
            return false;
        }
     }

    try {
        // Create Company
        const companyCollectionRef = collection(firestore, 'companies');
        const companyDocRef = await addDoc(companyCollectionRef, { name: companyName });

        // Create Admin Employee for that company
        const employeesCollectionRef = collection(firestore, `companies/${companyDocRef.id}/employees`);
        await addDoc(employeesCollectionRef, {
            username: adminUsername,
            password: adminPass, // WARNING: Storing plain text password
            role: 'Admin',
            companyId: companyDocRef.id,
            permissions: {
                canViewDashboard: true,
                canViewInventory: true,
                canManageInventory: true,
                canViewSales: true,
                canManageSales: true,
                canViewProduction: true,
                canManageProduction: true,
                canViewOrders: true,
                canManageOrders: true,
                canViewReports: true,
                canViewSettings: true,
                canManageUsers: true,
            }
        });

        return true;
    } catch (error) {
        console.error("Registration error: ", error);
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

  const value = { user, companyId, loading, login, logout, registerCompany };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
