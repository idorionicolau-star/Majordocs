"use client";

import { useState, useEffect } from "react";
import { useFirestore } from "@/firebase";
import { collection, getDocs, QuerySnapshot, DocumentData } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { Company } from "@/lib/types";
import { Building } from "lucide-react";

type CompanyWithId = Company & { id: string };

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    const fetchCompanies = async () => {
      if (!firestore) return;
      setLoading(true);
      try {
        const companiesCollectionRef = collection(firestore, "companies");
        const snapshot: QuerySnapshot<DocumentData> = await getDocs(companiesCollectionRef);
        const companiesList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CompanyWithId));
        setCompanies(companiesList);
      } catch (error) {
        console.error("Erro ao buscar empresas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [firestore]);

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold">Plataforma de Empresas</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Visualize todas as empresas registadas no sistema.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Empresas Registadas
          </CardTitle>
          <CardDescription>
            A lista abaixo mostra todas as empresas na base de dados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Empresa</TableHead>
                <TableHead>ID da Empresa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : companies.length > 0 ? (
                companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell className="font-mono text-xs">{company.id}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    Nenhuma empresa encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
