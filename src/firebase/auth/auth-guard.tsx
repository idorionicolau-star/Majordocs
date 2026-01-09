
'use client';

// This component is no longer needed as its logic has been
// centralized into `src/components/layout/client-layout.tsx`
// to prevent race conditions and simplify the component tree.
// It can be safely deleted in a future step.

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

  if (!authContext || authContext.loading || !authContext.user || !authContext.companyId) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        A carregar aplicação...
      </div>
    );
  }

  return <>{children}</>;
}
