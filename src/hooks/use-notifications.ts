'use client';

import { useEffect, useState, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { useMessaging, useFirebaseApp } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

export function useNotifications() {
    const messaging = useMessaging();
    const firebaseApp = useFirebaseApp();
    const { toast } = useToast();
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    const requestPermission = useCallback(async () => {
        if (!messaging) return;

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                if (!process.env.NEXT_PUBLIC_VAPID_KEY) {
                    console.warn('[Notifications] NEXT_PUBLIC_VAPID_KEY não configurada no .env.local — notificações push desativadas.');
                    return;
                }
                try {
                    const token = await getToken(messaging, {
                        vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
                    });
                    if (token) {
                        setFcmToken(token);
                        console.log('[Notifications] FCM Token registado com sucesso.');
                    } else {
                        console.warn('[Notifications] Nenhum token FCM disponível.');
                    }
                } catch (tokenErr) {
                    // getToken can fail if the service worker isn't registered or VAPID key is invalid.
                    // We catch it here to prevent it from breaking other app functionality.
                    console.warn('[Notifications] Falha ao registar service worker do FCM — notificações push indisponíveis.', tokenErr);
                }
            } else {
                console.log('[Notifications] Permissão de notificação negada pelo utilizador.');
            }
        } catch (err) {
            console.warn('[Notifications] Erro ao solicitar permissão de notificação:', err);
        }
    }, [messaging]);

    useEffect(() => {
        if (messaging) {
            requestPermission();

            const unsubscribe = onMessage(messaging, (payload) => {
                console.log('Message received. ', payload);
                toast({
                    title: payload.notification?.title || 'Nova Notificação',
                    description: payload.notification?.body || '',
                });
            });

            return () => unsubscribe();
        }
    }, [messaging, requestPermission, toast]);

    return { fcmToken, requestPermission };
}
