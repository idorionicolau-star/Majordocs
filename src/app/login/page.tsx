

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
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


const loginSchema = z.object({
  email: z.string().email('O email fornecido não é válido.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login, signInWithGoogle } = useContext(InventoryContext) || {};
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const handleLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      if (login) {
        const success = await login(data.email, data.password);
        if (success) {
          toast({
            title: 'Login bem-sucedido!',
            description: 'A redirecionar para o dashboard...',
          });
          router.push('/dashboard');
        } 
      } else {
        throw new Error('Serviço de autenticação não disponível.');
      }
    } catch (error: any) {
      if (!toast) {
          toast({
            variant: 'destructive',
            title: 'Erro de Login',
            description: error.message || 'Ocorreu um erro ao tentar fazer login.',
          });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      if (signInWithGoogle) {
        await signInWithGoogle();
        // The context's onAuthStateChanged will handle redirection
      } else {
        throw new Error("Login com Google não está configurado.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
       <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Image src="/logo.svg" alt="MajorStockX Logo" width={48} height={48} className="dark:invert" />
            </div>
            <CardTitle className="text-2xl font-bold">Bem-vindo de volta!</CardTitle>
            <CardDescription>Faça login para aceder ao MajorStockX.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="space-y-4">
                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading || isLoading}>
                    {isGoogleLoading ? 'A verificar...' : <><GoogleIcon /> Entrar com Google</>}
                </Button>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
                    </div>
                </div>
                <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                        <Label htmlFor="email">Email de Login</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <button type="button" className="p-1" aria-label="Ajuda sobre o formato do email">
                                <Info className="h-4 w-4 text-muted-foreground" />
                            </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <div className="p-3 text-xs max-w-xs space-y-2">
                                <p className="font-bold">Formato do Email de Login</p>
                                <p><strong className="text-primary">Admin:</strong> Use o email completo do registo (ex: `admin@empresa.com`).</p>
                                <p><strong className="text-primary">Funcionário:</strong> Use o formato `utilizador@empresa.com`.</p>
                            </div>
                            </PopoverContent>
                        </Popover>
                        </div>
                        <Input id="email" {...register('email')} placeholder="ex: admin@suaempresa.com" type="email" />
                        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input id="password" type={showPassword ? 'text' : 'password'} {...register('password')} placeholder="A sua senha" />
                        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
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
                        {isLoading ? 'A entrar...' : 'Entrar'}
                    </Button>
                </form>
             </div>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
            <p className="text-muted-foreground">
                Não tem uma conta? <Link href="/register" className="text-primary hover:underline">Crie uma aqui.</Link>
            </p>
        </CardFooter>
       </Card>
    </div>
  );
}

