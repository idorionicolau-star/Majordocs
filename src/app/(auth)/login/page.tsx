
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthContext } from '@/firebase/auth/auth-context';
import Image from 'next/image';

const loginSchema = z.object({
  username: z.string().min(1, 'O nome de utilizador é obrigatório.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);

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
        const success = await login(data.username, data.password);
        if (success) {
          toast({
            title: 'Login bem-sucedido!',
            description: 'A redirecionar para o dashboard...',
          });
          router.push('/dashboard');
        } else {
          throw new Error('Credenciais inválidas. Verifique o seu nome de utilizador e senha.');
        }
      } else {
        throw new Error('Serviço de autenticação não disponível.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de Login',
        description: error.message || 'Ocorreu um erro ao tentar fazer login.',
      });
    } finally {
      setIsLoading(false);
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
             <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="username">Nome de Utilizador</Label>
                    <Input id="username" {...register('username')} placeholder="O seu nome de utilizador" />
                    {errors.username && <p className="text-xs text-red-500">{errors.username.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input id="password" type="password" {...register('password')} placeholder="A sua senha" />
                    {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'A entrar...' : 'Entrar'}
                </Button>
            </form>
        </CardContent>
       </Card>
    </div>
  );
}
