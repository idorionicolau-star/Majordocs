
'use client';

import { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryContext } from '@/context/inventory-context';
import Image from 'next/image';

const onboardingSchema = z.object({
  companyName: z.string().min(3, 'O nome da empresa deve ter pelo menos 3 caracteres.'),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding, firebaseUser } = useContext(InventoryContext) || {};
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
  });

  const handleOnboarding = async (data: OnboardingFormValues) => {
    setIsLoading(true);
    if (completeOnboarding) {
      const success = await completeOnboarding(data.companyName);
      if (success) {
        router.push('/dashboard');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
       <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Image src="/logo.svg" alt="MajorStockX Logo" width={48} height={48} className="dark:invert" />
            </div>
            <CardTitle className="text-2xl font-bold">Bem-vindo(a), {firebaseUser?.displayName || 'Utilizador'}!</CardTitle>
            <CardDescription>Para finalizar, por favor, insira o nome da sua empresa.</CardDescription>
        </CardHeader>
        <CardContent>
             <form onSubmit={handleSubmit(handleOnboarding)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input id="companyName" {...register('companyName')} placeholder="O nome da sua empresa" />
                    {errors.companyName && <p className="text-xs text-red-500">{errors.companyName.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'A criar empresa...' : 'Finalizar Configuração'}
                </Button>
            </form>
        </CardContent>
        <CardFooter />
       </Card>
    </div>
  );
}

