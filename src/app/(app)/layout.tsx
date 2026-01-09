
'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { InventoryProvider, InventoryContext } from '@/context/inventory-context';
import { useContext } from 'react';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const inventoryContext = useContext(InventoryContext);
  const { userData, companyData, loading: dataLoading } = inventoryContext || {};
  const router = useRouter();
  
  const isLoading = userLoading || dataLoading;

  useEffect(() => {
    if (isLoading) {
      return; 
    }

    if (!user) {
      router.push('/login');
      return;
    }

    if (!companyData?.name) {
      router.push('/register-company');
      return;
    }
  }, [user, companyData, isLoading, router]);

  if (isLoading || !user || !companyData?.name) {
    return <div className="flex h-screen w-full items-center justify-center">A carregar aplicação...</div>;
  }

  return <>{children}</>;
}


export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <InventoryProvider>
      <AuthGuard>
        {children}
      </AuthGuard>
    </InventoryProvider>
  );
}
