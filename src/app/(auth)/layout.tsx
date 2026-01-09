
'use client';

import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// O AuthLayout agora verifica se um utilizador já está autenticado
// e, em caso afirmativo, redireciona-o para o dashboard para evitar
// que veja as páginas de login/registo desnecessariamente.
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);
  
  // Enquanto verifica, ou se não houver utilizador, mostra o conteúdo (ex: formulário de login)
  if (loading || user) {
     return <div className="flex h-screen w-full items-center justify-center">A redirecionar...</div>;
  }

  return <>{children}</>;
}
