
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
      router.replace('/dashboard');
  }, [router]);

  // Renderiza um loader universal enquanto a lógica de redirecionamento está a decorrer
  return (
    <div className="flex h-screen w-full items-center justify-center">
      A carregar...
    </div>
  );
}
