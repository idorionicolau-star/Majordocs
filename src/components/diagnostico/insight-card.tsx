
"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface InsightCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
  alertType?: 'critical' | 'warning' | 'success';
}

export function InsightCard({ title, icon: Icon, children, className, fullHeight, alertType }: InsightCardProps) {
  
  const alertClasses = {
      critical: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-500/30",
      warning: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-500/30",
      success: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-500/30"
  };

  const iconColorClasses = {
      critical: "text-red-600",
      warning: "text-amber-600",
      success: "text-emerald-600",
  }

  return (
    <Card className={cn(
        'bg-white shadow-sm rounded-xl',
        fullHeight && 'h-full',
        alertType && alertClasses[alertType],
        className
    )}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
            <Icon className={cn("h-5 w-5 text-muted-foreground", alertType && iconColorClasses[alertType])} />
            <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
