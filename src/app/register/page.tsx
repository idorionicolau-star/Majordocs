

'use client';

import { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryContext } from '@/context/inventory-context';
import Image from 'next/image';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';

const registerSchema = z.object({
  companyName: z.string().min(3, 'O nome da empresa deve ter pelo menos 3 caracteres.').refine(s => !s.includes('@'), 'O nome da empresa não pode conter "@".'),
  adminUsername: z.string().min(3, 'O nome de utilizador deve ter pelo menos 3 caracteres.').refine(s => !s.includes('@'), 'O nome de utilizador não pode conter "@".'),
  adminEmail: z.string().email("O email do administrador não é válido."),
  adminPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const GoogleIcon = () => (
    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);


export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const context = useContext(InventoryContext);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const companyName = watch('companyName');
  const adminUsername = watch('adminUsername');

  const handleRegister = async (data: RegisterFormValues) => {
    setIsLoading(true);
    if (!context?.registerCompany) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Função de registo não disponível.' });
        setIsLoading(false);
        return;
    }

    try {
        const success = await context.registerCompany(data.companyName, data.adminUsername, data.adminEmail, data.adminPassword);
        if (success) {
            // onAuthStateChanged in context will handle redirection
            toast({
                title: 'Empresa Registada com Sucesso!',
                description: `A fazer login com a conta "${data.adminEmail}"...`,
            });
        }
    } catch (error: any) {
       // The toast for the error is already handled inside the registerCompany function
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!context?.signInWithGoogle) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Login com Google não configurado.' });
      return;
    }
    setGoogleLoading(true);
    try {
      await context.signInWithGoogle();
      // The context will handle the redirection logic
    } catch (error: any) {
      setGoogleLoading(false);
      // Errors are toasted within the signInWithGoogle function in the context
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
       <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Image src="/logo.svg" alt="MajorStockX Logo" width={48} height={48} className="dark:invert" />
            </div>
            <CardTitle className="text-2xl font-bold">Crie a sua Conta</CardTitle>
            <CardDescription>Registe a sua empresa para começar a usar o MajorStockX.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading || isLoading}>
                    {isGoogleLoading ? 'A verificar...' : <><GoogleIcon /> Registar com Google</>}
                </Button>
                 <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Ou registe com email</span>
                    </div>
                </div>
                 <form onSubmit={handleSubmit(handleRegister)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="companyName">Nome da Empresa</Label>
                        <Input id="companyName" {...register('companyName')} placeholder="O nome da sua empresa" />
                        {errors.companyName && <p className="text-xs text-red-500">{errors.companyName.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="adminUsername">Nome de Utilizador do Administrador</Label>
                        <Input id="adminUsername" {...register('adminUsername')} placeholder="Ex: admin" />
                        {errors.adminUsername && <p className="text-xs text-red-500">{errors.adminUsername.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="adminEmail">Email do Administrador</Label>
                        <Input id="adminEmail" {...register('adminEmail')} placeholder="Ex: admin@suaempresa.com" type="email" />
                        <p className="text-[11px] text-muted-foreground bg-muted p-2 rounded-md">
                            Este será o seu email para fazer login no sistema.
                        </p>
                        {errors.adminEmail && <p className="text-xs text-red-500">{errors.adminEmail.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="adminPassword">Senha do Administrador</Label>
                        <Input id="adminPassword" type={showPassword ? 'text' : 'password'} {...register('adminPassword')} placeholder="Crie uma senha segura" />
                        {errors.adminPassword && <p className="text-xs text-red-500">{errors.adminPassword.message}</p>}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="show-password" checked={showPassword} onCheckedChange={(checked) => setShowPassword(!!checked)} />
                        <label
                            htmlFor="show-password"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Mostrar senha
                        </label>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                        {isLoading ? 'A registar...' : 'Registar Empresa'}
                    </Button>
                </form>
            </div>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
            <p className="text-muted-foreground">
                Já tem uma conta? <Link href="/login" className="text-primary hover:underline">Faça login.</Link>
            </p>
        </CardFooter>
       </Card>
    </div>
  );
}

