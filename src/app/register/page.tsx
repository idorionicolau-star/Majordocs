
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

const registerSchema = z.object({
  companyName: z.string().min(3, 'O nome da empresa deve ter pelo menos 3 caracteres.').refine(s => !s.includes('@'), 'O nome da empresa não pode conter "@".'),
  adminUsername: z.string().min(3, 'O nome de utilizador deve ter pelo menos 3 caracteres.').refine(s => !s.includes('@'), 'O nome de utilizador não pode conter "@".'),
  adminPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const context = useContext(InventoryContext);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const handleRegister = async (data: RegisterFormValues) => {
    setIsLoading(true);
    if (!context?.registerCompany) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Função de registo não disponível.' });
        setIsLoading(false);
        return;
    }

    try {
        const normalizedCompanyName = data.companyName.toLowerCase().replace(/\s+/g, '');
        const fullAdminUsername = `${data.adminUsername}@${normalizedCompanyName}`;
        const success = await context.registerCompany(data.companyName, fullAdminUsername, data.adminPassword);
        if (success) {
            toast({
                title: 'Empresa Registada com Sucesso!',
                description: `Pode agora fazer login com "${fullAdminUsername}".`,
            });
            router.push('/login');
        } else {
            throw new Error('Não foi possível registar a empresa. O nome da empresa ou utilizador pode já existir.');
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Erro no Registo',
            description: error.message || 'Ocorreu um erro inesperado.',
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
            <CardTitle className="text-2xl font-bold">Crie a sua Conta</CardTitle>
            <CardDescription>Registe a sua empresa para começar a usar o MajorStockX.</CardDescription>
        </CardHeader>
        <CardContent>
             <form onSubmit={handleSubmit(handleRegister)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input id="companyName" {...register('companyName')} placeholder="O nome da sua empresa" />
                    {errors.companyName && <p className="text-xs text-red-500">{errors.companyName.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="adminUsername">Nome de Utilizador do Administrador</Label>
                    <Input id="adminUsername" {...register('adminUsername')} placeholder="Ex: admin" />
                     <p className="text-[10px] text-muted-foreground">Será criado como: admin@nomedaempresa</p>
                    {errors.adminUsername && <p className="text-xs text-red-500">{errors.adminUsername.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="adminPassword">Senha do Administrador</Label>
                    <Input id="adminPassword" type="password" {...register('adminPassword')} placeholder="Crie uma senha segura" />
                    {errors.adminPassword && <p className="text-xs text-red-500">{errors.adminPassword.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'A registar...' : 'Registar Empresa'}
                </Button>
            </form>
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
