
'use client';

import { useState, useContext, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';

const onboardingSchema = z.object({
  companyName: z.string().min(3, 'O nome da empresa deve ter pelo menos 3 caracteres.'),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { completeOnboarding, firebaseUser, loading, needsOnboarding } = useContext(InventoryContext) || {};
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
  });
  
  useEffect(() => {
    // This check is a safeguard, the main logic is in ClientLayout
    if (!loading && !needsOnboarding) {
        router.replace('/dashboard');
    }
  }, [loading, needsOnboarding, router]);

  const handleOnboarding = async (data: OnboardingFormValues) => {
    setIsSubmitting(true);
    if (completeOnboarding) {
        try {
            const success = await completeOnboarding(data.companyName);
            if (success) {
                toast({ title: 'Bem-vindo(a)!', description: 'A sua empresa foi criada com sucesso.' });
                router.push('/dashboard');
            }
        } catch (error: any) {
            // Error toast is handled inside completeOnboarding, but we catch to stop spinner
        }
    }
    setIsSubmitting(false);
  };
  
  // Display a loader while the initial auth check is running
  if (loading || !needsOnboarding) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

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
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'A criar empresa...' : 'Finalizar Configuração'}
                </Button>
            </form>
        </CardContent>
        <CardFooter />
       </Card>
    </div>
  );
}

