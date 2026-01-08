
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { updateUserProfile } from '@/firebase/auth/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export default function RegisterCompanyPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [companyName, setCompanyName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !companyName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'O nome da empresa não pode estar em branco.',
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Update the user's document in Firestore with the company name.
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        name: companyName.trim(), // Using the 'name' field for the company name
      });
      
      // Also update the display name in Firebase Auth profile if it's different
      if (user.displayName !== companyName.trim()) {
        await updateUserProfile(user, { displayName: companyName.trim() });
      }

      toast({
        title: 'Empresa Registrada!',
        description: 'Bem-vindo ao MajorStockX!',
      });

      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Registrar Empresa',
        description: 'Não foi possível guardar o nome da empresa. Tente novamente.',
      });
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen w-full items-center justify-center">A carregar...</div>;
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col justify-center items-center gap-3 mb-6">
          <Image
            src="/logo.svg"
            alt="MajorStockX Logo"
            width={40}
            height={40}
            className="text-primary"
          />
          <h1 className="text-3xl font-headline font-bold text-primary">
            MajorStockX
          </h1>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline">
              Quase lá!
            </CardTitle>
            <CardDescription>
              Para finalizar, por favor, insira o nome da sua empresa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="company-name">Nome da Empresa</Label>
                <Input
                  id="company-name"
                  placeholder="Ex: Construções & Filhos, Lda"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'A guardar...' : 'Concluir Registo'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
