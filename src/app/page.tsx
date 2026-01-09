
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      A carregar...
    </div>
  );
}
