
"use client"

import { useContext, useState } from 'react';
import { Bell, AlertTriangle, ShoppingCart, Hammer, ClipboardList } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { InventoryContext } from '@/context/inventory-context';
import type { AppNotification } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

const iconMap = {
    'stock': AlertTriangle,
    'sale': ShoppingCart,
    'production': Hammer,
    'order': ClipboardList,
}

function NotificationsDropdownContent() {
  const { notifications, markNotificationAsRead, markAllAsRead, clearNotifications } = useContext(InventoryContext) || {};
  const router = useRouter();

  if (!notifications) return null;
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification: AppNotification) => {
    if(!markNotificationAsRead) return;
    markNotificationAsRead(notification.id);
    if(notification.href) {
        router.push(notification.href);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0 text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
            <span>Notificações</span>
            {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs font-normal text-primary hover:underline">Marcar todas como lidas</button>
            )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
            {notifications.length > 0 ? notifications.map(notification => {
                const Icon = iconMap[notification.type as keyof typeof iconMap] || AlertTriangle;
                return (
                    <DropdownMenuItem 
                        key={notification.id} 
                        className={cn(
                            "flex items-start gap-3 whitespace-normal cursor-pointer",
                            !notification.read && "bg-accent"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                    >
                        <div className="mt-1">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                            <p className={cn("text-sm", !notification.read && "font-semibold")}>{notification.message}</p>
                            <p className="text-xs text-muted-foreground">{new Date(notification.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        </div>
                    </DropdownMenuItem>
                )
            }) : (
                <div className="text-center text-sm text-muted-foreground py-10">
                    Nenhuma notificação por agora.
                </div>
            )}
        </ScrollArea>
        {notifications && notifications.length > 0 && (
            <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearNotifications} className="justify-center text-destructive focus:text-destructive">
                    Limpar Notificações
                </DropdownMenuItem>
            </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function NotificationsDropdown() {
    const { loading } = useContext(InventoryContext) || { loading: true };

    if (loading) {
      return (
        <Button variant="ghost" size="icon" className="relative" disabled>
          <Bell className="h-5 w-5" />
        </Button>
      )
    }

  return <NotificationsDropdownContent />;
}
