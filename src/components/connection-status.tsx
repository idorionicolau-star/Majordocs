
"use client";

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
      setIsOnline(window.navigator.onLine);
    }
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleForceSync = () => {
    if (!isOnline) return;
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 2000);
  };

  const status = isSyncing ? 'syncing' : isOnline ? 'online' : 'offline';
  
  const statusInfo = {
    online: {
      label: 'Online',
      icon: <Wifi className="h-4 w-4 text-green-500" />,
      tooltip: 'Conectado e dados sincronizados.'
    },
    offline: {
      label: 'Offline',
      icon: <WifiOff className="h-4 w-4 text-destructive" />,
      tooltip: 'A trabalhar offline. As alterações serão sincronizadas quando estiver online.'
    },
    syncing: {
      label: 'Sincronizando',
      icon: <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-accent border-t-transparent" />,
      tooltip: 'A sincronizar dados com o servidor...'
    }
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-white/10">
              {statusInfo[status].icon}
              <span className="hidden lg:inline">{statusInfo[status].label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{statusInfo[status].tooltip}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleForceSync} disabled={!isOnline || isSyncing} className="h-8 w-8">
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Forçar Sincronização</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
