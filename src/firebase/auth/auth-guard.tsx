
'use client';

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from './auth-context';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const authContext = useContext(AuthContext);

  useEffect(() => {
    if (authContext && !authContext.loading && !authContext.user) {
      router.push('/login');
    }
  }, [authContext, router]);

  // Se o contexto ainda não estiver disponível, ou se estiver a carregar,
  // ou se não houver utilizador ou companyId, mostra o loader.
  // Isto impede que os componentes filhos (como o InventoryProvider) tentem
  // carregar dados antes de a autenticação estar completa.
  if (!authContext || authContext.loading || !authContext.user || !authContext.companyId) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        A carregar aplicação...
      </div>
    );
  }

  // Apenas renderiza os filhos quando a autenticação estiver 100% confirmada.
  return <>{children}</>;
}
