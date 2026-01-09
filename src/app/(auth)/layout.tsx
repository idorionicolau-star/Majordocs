
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // This layout is no longer needed but kept to avoid breaking routing.
  // It will be removed in a future step.
  return <>{children}</>;
}
