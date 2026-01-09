
'use client';

import { useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { InventoryProvider, InventoryContext } from '@/context/inventory-context';
import { useContext } from 'react';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const inventoryContext = useContext(InventoryContext);
  const { loading: dataLoading } = inventoryContext || { loading: true };
  const router = useRouter();
  
  const isLoading = userLoading || dataLoading;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
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
