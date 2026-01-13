

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

const loginSchema = z.object({
  email: z.string().email('O email fornecido não é válido.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useContext(InventoryContext) || {};
  const [isLoading, setIsLoading] = useState(false);
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
        // A função login agora lança erros específicos que são apanhados pelo catch.
      } else {
        throw new Error('Serviço de autenticação não disponível.');
      }
    } catch (error: any) {
      // O toast de erro já é tratado dentro da função login, 
      // mas mantemos este catch como um fallback.
      if (!toast) { // Se o toast não for acionado dentro do login
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
                    <Label htmlFor="email">Email de Login</Label>
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
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'A entrar...' : 'Entrar'}
                </Button>
            </form>
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

    