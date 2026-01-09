
'use client';

import { useEffect, useContext } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useRouter, usePathname } from 'next/navigation';
import { InventoryProvider, InventoryContext } from '@/context/inventory-context';

const ADMIN_ONLY_PAGES = ['/users', '/settings'];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const inventoryContext = useContext(InventoryContext);
  
  const { userData, loading: dataLoading } = inventoryContext || { userData: null, loading: true };
  const router = useRouter();
  const pathname = usePathname();
  
  const isLoading = userLoading || dataLoading;

  useEffect(() => {
    if (isLoading) {
      return; // Não fazer nada enquanto carrega
    }

    // Se não estiver a carregar e não houver um utilizador autenticado, vai para o login.
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Se o utilizador está logado mas não tem dados (perfil), aguarda.
    if (!userData) {
       console.log("Utilizador autenticado mas sem dados de perfil no Firestore. A aguardar...");
       // Poderíamos ter um loading state aqui ou um redirecionamento se demorar muito.
       return;
    }

    // LÓGICA DE PERMISSÕES POR FUNÇÃO
    const isRestrictedPage = ADMIN_ONLY_PAGES.some(page => pathname.startsWith(page));
    const isEmployee = userData.role === 'Employee';

    if (isEmployee && isRestrictedPage) {
      // Se for um funcionário a tentar aceder a uma página restrita, redireciona.
      router.replace('/dashboard');
    }

  }, [user, userData, isLoading, router, pathname]);

  if (isLoading || !user || !userData) {
    return <div className="flex h-screen w-full items-center justify-center">A carregar aplicação...</div>;
  }

  // Se tudo estiver carregado e o perfil do utilizador existir (e tiver permissão), mostra a aplicação.
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
