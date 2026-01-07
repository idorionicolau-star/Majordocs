
"use client";

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/lib/types";

interface ApproveUserDialogProps {
  user: User;
  onApprove: (userId: string) => void;
  children: React.ReactNode;
}

export function ApproveUserDialog({ user, onApprove, children }: ApproveUserDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleApprove = () => {
    onApprove(user.id);
    toast({
      title: "Usuário aprovado",
      description: `${user.name} foi aprovado com sucesso.`,
    });
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aprovar Usuário?</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem certeza que deseja aprovar o usuário {user.name}? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleApprove}>Aprovar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
