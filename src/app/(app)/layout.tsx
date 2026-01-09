
'use client';

import { useEffect, useContext } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { InventoryProvider, InventoryContext } from '@/context/inventory-context';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const inventoryContext = useContext(InventoryContext);
  
  // O userData agora vem do contexto, que já o obtém do Firestore.
  const { userData, loading: dataLoading } = inventoryContext || { userData: null, loading: true };
  const router = useRouter();
  
  const isLoading = userLoading || dataLoading;

  useEffect(() => {
    // Se não estiver a carregar e não houver um utilizador autenticado, vai para o login.
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }
    
    // Se estiver logado mas ainda não tivermos os dados do perfil (role, companyId),
    // pode ser um sinal de que o perfil ainda não foi criado no Firestore
    // ou há um atraso. Por agora, vamos esperar.
    // No futuro, podemos redirecionar para uma página de "perfil incompleto".
    if (!isLoading && user && !userData) {
       console.log("Utilizador autenticado mas sem dados de perfil no Firestore. A aguardar...");
       // Poderíamos ter um loading state aqui ou um redirecionamento se demorar muito.
    }

  }, [user, userData, isLoading, router]);

  if (isLoading || !user || !userData) {
    return <div className="flex h-screen w-full items-center justify-center">A carregar aplicação...</div>;
  }

  // Se tudo estiver carregado e o perfil do utilizador existir, mostra a aplicação.
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
