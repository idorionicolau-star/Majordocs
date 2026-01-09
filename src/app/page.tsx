
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page now simply redirects to the dashboard.
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      A redirecionar para o painel de controlo...
    </div>
  );
}
