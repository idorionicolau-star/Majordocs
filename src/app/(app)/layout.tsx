
'use client';

// O AuthGuard e o InventoryProvider foram movidos para o ClientLayout
// para garantir a ordem correta de inicialização e evitar condições de corrida.
// Este layout agora serve apenas como um marcador para o grupo de rotas da aplicação.

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
