
'use client';

import { useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthContext } from './auth-context';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useContext(AuthContext);

  useEffect(() => {
    if (!loading && !user) {
      // Se não está a carregar e não há utilizador, redireciona para o login
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // Enquanto carrega ou se o utilizador não estiver autenticado (antes do redirecionamento),
    // mostra um loader para evitar piscar do conteúdo antigo.
    return (
      <div className="flex h-screen w-full items-center justify-center">
        A carregar aplicação...
      </div>
    );
  }

  // Se o utilizador estiver autenticado, mostra o conteúdo da página
  return <>{children}</>;
}
