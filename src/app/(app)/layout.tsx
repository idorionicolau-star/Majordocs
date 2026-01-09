
'use client';

import { useEffect, useContext } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useRouter, usePathname } from 'next/navigation';
import { InventoryProvider, InventoryContext } from '@/context/inventory-context';

const ADMIN_ONLY_PAGES = ['/users', '/settings'];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const inventoryContext = useContext(InventoryContext);
  
  const { userData, loading: dataLoading, companyId } = inventoryContext || { userData: null, loading: true, companyId: null };
  const router = useRouter();
  const pathname = usePathname();
  
  const isLoading = userLoading || dataLoading;

  useEffect(() => {
    if (isLoading) {
      return; // Não fazer nada enquanto carrega
    }

    // Se não estiver a carregar e não houver um utilizador autenticado, vai para o login.
    if (!user) {
      router.replace('/login');
      return;
    }
    
    // Se o utilizador estiver autenticado mas o companyId ainda não foi carregado,
    // e o utilizador não for um funcionário (ou seja, é um admin a registar a empresa), não faz nada.
    // O redirecionamento será tratado pela página register-company.
    if (user && !companyId && !pathname.includes('/register-company')) {
        const tempUserData = (inventoryContext as any)?.tempUser;
        if(tempUserData?.role !== 'Employee') {
            router.replace('/register-company');
            return;
        }
    }
    
    // Se o utilizador está logado mas não tem dados (perfil), aguarda.
    if (!userData && !pathname.includes('/register-company')) {
       console.log("Utilizador autenticado mas sem dados de perfil no Firestore. A aguardar...");
       return;
    }

    // LÓGICA DE PERMISSÕES POR FUNÇÃO
    if (userData) {
        const isRestrictedPage = ADMIN_ONLY_PAGES.some(page => pathname.startsWith(page));
        const isEmployee = userData.role === 'Employee';

        if (isEmployee && isRestrictedPage) {
          // Se for um funcionário a tentar aceder a uma página restrita, redireciona.
          router.replace('/dashboard');
        }
    }


  }, [user, userData, companyId, isLoading, router, pathname, inventoryContext]);

  if (isLoading || !user) {
    return <div className="flex h-screen w-full items-center justify-center">A carregar aplicação...</div>;
  }
  
  // Se o utilizador é um admin e ainda não tem empresa, mas está na página correta
  if(!companyId && pathname.includes('/register-company')) {
      return <>{children}</>;
  }
  
  // Se o utilizador é um admin, mas ainda não tem companyId, mostra o loader
  if (!companyId) {
      return <div className="flex h-screen w-full items-center justify-center">A configurar a sua empresa...</div>;
  }
  
  if (!userData) {
      return <div className="flex h-screen w-full items-center justify-center">A carregar dados do utilizador...</div>;
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
