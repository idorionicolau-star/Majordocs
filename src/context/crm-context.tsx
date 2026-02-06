'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Customer } from '@/lib/types';
import { useInventory } from '@/context/inventory-context';
import { db } from '@/firebase/index';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

interface CRMContextType {
    customers: Customer[];
    addCustomer: (customerData: Omit<Customer, 'id' | 'totalPurchases' | 'lastVisit'>) => Promise<void>;
    updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
    deleteCustomer: (id: string) => Promise<void>;
    loading: boolean;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export function CRMProvider({ children }: { children: ReactNode }) {
    const { companyId, user } = useInventory();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!companyId) {
            setCustomers([]);
            setLoading(false);
            return;
        }

        const customersRef = collection(db, `companies/${companyId}/customers`);
        const q = query(customersRef, orderBy('name'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const customersList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Customer[];
            setCustomers(customersList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching customers:", error);
            toast({
                variant: "destructive",
                title: "Erro ao carregar clientes",
                description: "Verifique a sua conexão.",
            });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [companyId]);

    const addCustomer = async (customerData: Omit<Customer, 'id' | 'totalPurchases' | 'lastVisit'>) => {
        if (!companyId || !user) return;
        try {
            const customersRef = collection(db, `companies/${companyId}/customers`);
            await addDoc(customersRef, {
                ...customerData,
                totalPurchases: 0,
                lastVisit: new Date().toISOString(),
                createdBy: user.username,
                createdAt: serverTimestamp(),
            });
            toast({ title: "Cliente adicionado", description: `${customerData.name} foi registado com sucesso.` });
        } catch (error) {
            console.error("Error adding customer:", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível adicionar o cliente." });
            throw error;
        }
    };

    const updateCustomer = async (id: string, data: Partial<Customer>) => {
        if (!companyId) return;
        try {
            const customerRef = doc(db, `companies/${companyId}/customers`, id);
            await updateDoc(customerRef, data);
            toast({ title: "Cliente atualizado" });
        } catch (error) {
            console.error("Error updating customer:", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o cliente." });
            throw error;
        }
    };

    const deleteCustomer = async (id: string) => {
        if (!companyId) return;
        try {
            const customerRef = doc(db, `companies/${companyId}/customers`, id);
            await deleteDoc(customerRef);
            toast({ title: "Cliente removido" });
        } catch (error) {
            console.error("Error deleting customer:", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover o cliente." });
            throw error;
        }
    };

    return (
        <CRMContext.Provider value={{ customers, addCustomer, updateCustomer, deleteCustomer, loading }}>
            {children}
        </CRMContext.Provider>
    );
}

export const useCRM = () => {
    const context = useContext(CRMContext);
    if (context === undefined) {
        throw new Error('useCRM must be used within a CRMProvider');
    }
    return context;
};
