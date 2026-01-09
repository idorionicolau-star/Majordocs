
'use client';

import { EmployeeManager } from '@/components/settings/employee-manager';

export default function EmployeesPage() {
  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-headline font-bold">
          Gestão de Funcionários
        </h1>
        <p className="text-muted-foreground">
          Adicione, visualize e gerencie os membros da sua equipa.
        </p>
      </div>
      <EmployeeManager />
    </div>
  );
}
