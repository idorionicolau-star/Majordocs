
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    if (loading) {
      return; // Aguarda o estado de autenticação ser definido
    }
    if (user) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Renderiza um loader universal enquanto a lógica de redirecionamento está a decorrer
  return (
    <div className="flex h-screen w-full items-center justify-center">
      A carregar...
    </div>
  );
}
