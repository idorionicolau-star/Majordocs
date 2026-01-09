
'use client';

// O AuthLayout agora simplesmente renderiza os seus filhos sem nenhuma lógica
// de redirecionamento. Isto garante que as páginas de login/registo possam
// ser sempre acedidas. A proteção das rotas da aplicação é feita no AppLayout.
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
