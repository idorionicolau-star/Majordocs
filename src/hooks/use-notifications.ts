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
                const token = await getToken(messaging, {
                    vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY, // Make sure to add this to .env.local
                });
                if (token) {
                    setFcmToken(token);
                    // Here you would typically send the token to your backend/firestore
                    console.log('FCM Token:', token);
                } else {
                    console.log('No registration token available. Request permission to generate one.');
                }
            } else {
                console.log('Unable to get permission to notify.');
            }
        } catch (err) {
            console.error('An error occurred while retrieving token. ', err);
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
