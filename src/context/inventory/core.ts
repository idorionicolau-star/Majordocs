'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, Sale, Production, Order, Company, Employee, ModulePermission, StockMovement, AppNotification, ChatMessage, RawMaterial, Recipe, NotificationEmail } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase, getFirebaseAuth } from '@/firebase/provider';
import { onAuthStateChanged, signOut, User as FirebaseAuthUser } from 'firebase/auth';
import { collection, doc, setDoc, onSnapshot, getDoc, serverTimestamp } from 'firebase/firestore';
import { categorizeLocally } from '@/lib/categorize-local';
import { ref } from "firebase/storage";
import { format, eachMonthOfInterval, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useSubscriptionState } from '@/hooks/useSubscriptionState';
import { links } from '@/lib/deep-links';
import { isCountableSale } from '@/lib/sale-filters';

type CatalogProduct = Omit<
  Product,
  'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'
>;
type CatalogCategory = { id: string; name: string };

export function useInventoryCore() {

  const [user, setUser] = useState<Employee | null>(null);

  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);

  const [companyId, setCompanyId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  // O Firebase ainda não disse se há sessão guardada? Até dizer, "sem utilizador" não quer dizer "sem sessão".
  const [authReady, setAuthReady] = useState(false);

  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [monthlySalesChartData, setMonthlySalesChartData] = useState<{ name: string; vendas: number }[]>([]);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const router = useRouter();

  const { toast } = useToast();

  const firestore = useFirestore();

  const auth = getFirebaseAuth();

  const wasSyncing = useRef(false);

  const [lastSaleTimestamp, setLastSaleTimestamp] = useState<number>(0);


  // Push notifications: see <PushPrompt /> in the client layout (needs a tap to ask permission).

  const [companyData, setCompanyData] = useState<Company | null>(null);

  const { isReadOnly, isTrial, daysLeft, renewInDays, reason: subscriptionReason } = useSubscriptionState(companyData);


  const locations = useMemo(() => companyData?.locations || [], [companyData]);

  const isMultiLocation = useMemo(() => !!companyData?.isMultiLocation, [companyData]);


  // Shared activity feed (Facebook-style): companies/{id}/notifications, visible on every device in real time.
  // `dedupeId` makes the doc id fixed so the same alert (e.g. critical stock of a product today) is only posted once.
  const postFeed = useCallback(async (n: { type: string; title: string; body?: string; link?: string; audience?: 'all' | 'managers'; dedupeId?: string }): Promise<boolean> => {
    if (!firestore || !companyId || !user) return false;
    const col = collection(firestore, `companies/${companyId}/notifications`);
    const ref = n.dedupeId ? doc(col, n.dedupeId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 140)) : doc(col);
    try {
      await setDoc(ref, {
        type: n.type,
        title: n.title,
        body: n.body || '',
        link: n.link || '/dashboard',
        audience: n.audience || 'all',
        actorId: user.id,
        actorName: user.username,
        createdAt: serverTimestamp(),
        readBy: [user.id],
      });
      return true;
    } catch {
      return false; // dedupe doc already exists (update not allowed) or offline error
    }
  }, [firestore, companyId, user]);


  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'date' | 'read'>) => {
    postFeed({ type: notification.type, title: notification.message, link: notification.href });
    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
        date: new Date().toISOString(),
        read: false,
        ...notification,
      },
      ...prev
    ].slice(0, 50)); // Keep last 50 notifications
  }, []);


  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);


  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);


  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);


  const handleSetProfilePicture = useCallback(async (pictureUrl: string) => {
    if (!firestore || !user || !user.id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Utilizador não autenticado.' });
      return;
    }

    toast({ title: 'A carregar...', description: 'A sua nova foto de perfil está a ser guardada.' });

    try {
      const userDocRef = doc(firestore, `companies/${user.companyId}/employees`, user.id);
      updateDocumentNonBlocking(userDocRef, { profilePictureUrl: pictureUrl });
      setProfilePicture(pictureUrl);

      toast({ title: 'Sucesso!', description: 'A sua foto de perfil foi atualizada.' });
    } catch (error) {
      console.error("Error updating profile picture: ", error);
      toast({ variant: 'destructive', title: 'Erro de Upload', description: 'Não foi possível guardar a sua foto.' });
    }
  }, [firestore, user, toast]);


  // Feed + push to the company's phones (other users). Fire-and-forget: never blocks or breaks a sale.
  const sendPush = useCallback((msg: { title: string; body: string; link?: string; tag?: string; type?: string; audience?: 'all' | 'managers'; dedupeId?: string; includeSelf?: boolean }) => {
    if (!companyId || typeof window === 'undefined') return;
    (async () => {
      try {
        const posted = await postFeed({ type: msg.type || 'info', title: msg.title, body: msg.body, link: msg.link, audience: msg.audience, dedupeId: msg.dedupeId });
        if (!posted && msg.dedupeId) return; // already notified (e.g. same critical product today)
        const fbToken = await auth.currentUser?.getIdToken();
        if (!fbToken) return;
        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${fbToken}` },
          body: JSON.stringify({ companyId, ...msg, excludeToken: (() => { try { return localStorage.getItem('majorstockx-push-token') || undefined; } catch { return undefined; } })() }),
        });
      } catch (e) {
        console.warn('[Push] envio falhou', e);
      }
    })();
  }, [companyId, auth, postFeed]);


  // Operações que mexem no stock usam transacções (seguras, mas precisam de internet).
  // Sem ligação, falham logo com uma mensagem clara em vez de ficarem à espera.
  const assertOnline = (what: string) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error(`Sem internet: ${what} precisa de ligação para não gastar stock que já não existe. Pode consultar tudo e registar entradas e contagens no Stock Rápido; tente de novo quando a ligação voltar.`);
    }
  };


  // Anti-roubo: avisos para o gestor (feed + push só para Admin/Dono).
  // Acções do próprio gestor não geram alerta.
  const isManagerUser = !!user && (user.role === 'Admin' || user.role === 'Dono');

  const notifyManagers = useCallback((msg: { title: string; body: string; link?: string; type?: string; dedupeId?: string; always?: boolean }) => {
    if (isManagerUser && !msg.always) return;
    sendPush({ type: msg.type || 'security', audience: 'managers', title: msg.title, body: msg.body, link: msg.link, dedupeId: msg.dedupeId, tag: msg.dedupeId });
  }, [sendPush, isManagerUser]);


  const triggerEmailAlert = useCallback(async (payload: any) => {
    const settings = companyData?.notificationSettings;

    if (payload.type === 'SALE') {
      const who = payload.soldBy ? ` · por ${payload.soldBy}` : '';
      const client = payload.clientName ? ` · ${payload.clientName}` : '';
      sendPush({
        type: 'sale',
        title: `💰 Nova venda — ${formatCurrency(Number(payload.totalValue) || 0)}`,
        body: `${payload.productName || 'Venda'}${client}${who}`,
        link: payload.guideNumber ? links.sale(String(payload.guideNumber)) : (payload.productName ? links.salesOfProduct(String(payload.productName)) : '/sales'),
      });
    }

    // Normalize emails list, handling both new format and legacy format
    const targetEmails: NotificationEmail[] = [];
    if (settings?.emails && Array.isArray(settings.emails)) {
      targetEmails.push(...settings.emails);
    } else if (settings?.email) {
      // Fallback for legacy single-email settings
      targetEmails.push({
        email: settings.email,
        onSale: settings.onSale || false,
        onCriticalStock: settings.onCriticalStock || false,
        onEndOfDayReport: false,
      });
    }

    if (targetEmails.length === 0) {
      console.warn("E-mail de notificação não configurado. Alerta não enviado.");
      return;
    }

    let isCriticalEvent = payload.type === 'CRITICAL';
    let isSaleEvent = payload.type === 'SALE';

    let subject = '';
    let notificationHref = '';
    let notificationType: 'stock' | 'sale' | 'production' | 'order' = 'stock';

    if (isCriticalEvent) {
      subject = `🚨 ALERTA: ${payload.productName} com stock baixo!`;
      notificationHref = '/inventory';
      notificationType = 'stock';
    } else if (isSaleEvent) {
      subject = `✅ Nova Venda: ${payload.productName}`;
      notificationHref = '/sales';
      notificationType = 'sale';
    }

    try {
      const fbToken = await auth.currentUser?.getIdToken();

      const validEmails = targetEmails
        .filter(target => {
          let shouldSend = false;
          if (isCriticalEvent && target.onCriticalStock) shouldSend = true;
          if (isSaleEvent && target.onSale) shouldSend = true;
          if (payload.type === 'END_OF_DAY_REPORT' && target.onEndOfDayReport) shouldSend = true;
          return shouldSend && target.email && target.email.trim() !== '';
        })
        .map(t => t.email);

      if (validEmails.length === 0) return;

      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${fbToken}`
        },
        body: JSON.stringify({ to: validEmails, subject, companyId, logoUrl: companyData?.logoUrl, companyName: companyData?.name, ...payload }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Email failed: ${errorBody.error || 'Erro desconhecido da API'}`);
      }
    } catch (error: any) {
      console.warn("Falha ao enviar e-mails de notificação:", error.message);
      toast({
        variant: "destructive",
        title: "Aviso de Notificação por E-mail",
        description: "Nem todos os alertas de e-mail foram enviados com sucesso.",
        duration: 8000,
      });
    }
  }, [companyData, addNotification, toast, auth, sendPush]);


  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged will handle the state updates (setUser, setFirebaseUser etc.)
      // and ClientLayout will handle the redirect.
      toast({ title: 'Sessão terminada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao sair' });
    }
  }, [auth, toast]);


  useEffect(() => {
    let cancelled = false;
    const isTransient = (e: unknown) => {
      const code = String((e as { code?: string })?.code || '');
      const msg = String((e as { message?: string })?.message || '');
      return code === 'unavailable' || code === 'deadline-exceeded' || code === 'resource-exhausted' || /offline|network|unavailable/i.test(msg);
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setAuthReady(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userMapDocRef = doc(firestore, `users/${fbUser.uid}`);
        // Falha de rede (sem sinal, ligação a acordar) NÃO é motivo para terminar a sessão: tenta de novo.
        for (let attempt = 0; attempt < 6 && !cancelled; attempt++) {
          try {
            const userMapDoc = await getDoc(userMapDocRef);
            if (userMapDoc.exists()) {
              setCompanyId(userMapDoc.data().companyId);
            } else if (userMapDoc.metadata.fromCache) {
              throw Object.assign(new Error('unavailable'), { code: 'unavailable' }); // cópia local incompleta: espera pelo servidor
            } else {
              throw new Error("Mapeamento de utilizador não encontrado.");
            }
            return;
          } catch (error) {
            if (isTransient(error) && attempt < 5) {
              await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
              continue;
            }
            if (isTransient(error)) {
              // Continua com sessão; quando a ligação voltar, recarrega para abrir normalmente.
              console.warn("Sem ligação para abrir a sessão; a manter o utilizador.");
              if (typeof window !== 'undefined') window.addEventListener('online', () => window.location.reload(), { once: true });
              return;
            }
            console.error("Error fetching user map:", error);
            logout();
            return;
          }
        }
      } else {
        setUser(null);
        setFirebaseUser(null);
        setCompanyId(null);
        setLoading(false);
      }
    });

    return () => { cancelled = true; unsubscribeAuth(); };
  }, [auth, firestore, logout]);


  useEffect(() => {
    let unsubscribeEmployee: () => void = () => { };

    if (firebaseUser && companyId) {
      setNotifications([]); // Clear notifications on company change
      setChatHistory([]); // Clear chat history on company change
      const employeeDocRef = doc(firestore, `companies/${companyId}/employees/${firebaseUser.uid}`);
      unsubscribeEmployee = onSnapshot(employeeDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const employeeData = { id: docSnap.id, ...docSnap.data() } as Employee;
          setUser(employeeData);
          if (employeeData.profilePictureUrl) {
            setProfilePicture(employeeData.profilePictureUrl);
          } else {
            setProfilePicture(null);
          }
          setLoading(false);
        } else if (docSnap.metadata.fromCache) {
          // Ainda só há a cópia local (sem sinal): não é prova de que o perfil não existe. Espera pelo servidor.
        } else {
          console.error("Perfil de funcionário não encontrado na empresa.");
          logout();
          setLoading(false);
        }
      }, (error) => {
        console.error("Error subscribing to employee data:", error);
        // Só termina a sessão se o servidor recusou o acesso; falhas de rede passam sozinhas.
        if ((error as { code?: string })?.code === 'permission-denied') logout();
        setLoading(false);
      });
    } else if (!firebaseUser && authReady) {
      setLoading(false);
    }

    return () => unsubscribeEmployee();
  }, [firebaseUser, companyId, firestore, logout, authReady]);


  const canView = (module: ModulePermission) => {
    if (!user) return false;
    if (user.role === 'Admin' || user.role === 'Dono') return true;
    const level = user.permissions?.[module];
    return level === 'read' || level === 'write';
  };


  const canEdit = (module: ModulePermission) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    if (user.role === 'Dono') return false;
    return user.permissions?.[module] === 'write';
  };



  const productsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/products`);
  }, [firestore, companyId]);


  const salesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/sales`);
  }, [firestore, companyId]);


  const productionsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/productions`);
  }, [firestore, companyId]);


  const ordersCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/orders`);
  }, [firestore, companyId]);


  const stockMovementsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/stockMovements`);
  }, [firestore, companyId]);


  const catalogProductsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/catalogProducts`);
  }, [firestore, companyId]);


  const catalogCategoriesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/catalogCategories`);
  }, [firestore, companyId]);


  const rawMaterialsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/rawMaterials`);
  }, [firestore, companyId]);


  const recipesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/recipes`);
  }, [firestore, companyId]);


  const companyDocRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return doc(firestore, `companies`, companyId);
  }, [firestore, companyId]);


  useEffect(() => {
    if (!productsCollectionRef) return;

    const unsubscribe = onSnapshot(productsCollectionRef, (snapshot) => {
      const isSyncing = snapshot.metadata.hasPendingWrites;

      if (wasSyncing.current && !isSyncing) {
        toast({
          title: 'Sincronizado!',
          description: 'As suas alterações foram guardadas no servidor.',
        });
      }

      wasSyncing.current = isSyncing;
    }, (error) => {
      console.error("Sync listener error:", error);
    });

    return () => unsubscribe();
  }, [productsCollectionRef, toast]);



  const { data: productsData, isLoading: productsLoading } = useCollection<Product>(productsCollectionRef);

  const { data: salesData, isLoading: salesLoading } = useCollection<Sale>(salesCollectionRef);

  const { data: productionsData, isLoading: productionsLoading } = useCollection<Production>(productionsCollectionRef);

  const { data: ordersData, isLoading: ordersLoading } = useCollection<Order>(ordersCollectionRef);

  const { data: stockMovementsData, isLoading: stockMovementsLoading } = useCollection<StockMovement>(stockMovementsCollectionRef);

  const { data: catalogProductsData, isLoading: catalogProductsLoading } = useCollection<CatalogProduct>(catalogProductsCollectionRef);

  const { data: catalogCategoriesData, isLoading: catalogCategoriesLoading } = useCollection<CatalogCategory>(catalogCategoriesCollectionRef);

  const { data: rawMaterialsData, isLoading: rawMaterialsLoading } = useCollection<RawMaterial>(rawMaterialsCollectionRef);

  const { data: recipesData, isLoading: recipesLoading } = useCollection<Recipe>(recipesCollectionRef);


  const products = useMemo(() => {
    if (!productsData) return [];

    const productMap = new Map<string, Product & { sourceIds: string[] }>();

    // Filter out deleted items FIRST
    const activeProducts = productsData.filter(p => !p.deletedAt);

    activeProducts.forEach(p => {
      const key = `${p.name}|${p.location || 'default'}`;
      // Ensure instanceId is ALWAYS present and unique-ish for React keys
      const productWithInstanceId = { ...p, instanceId: p.id || `inst-${p.name}-${p.location}` } as Product;

      if (productMap.has(key)) {
        const existing = productMap.get(key)!;
        existing.stock += productWithInstanceId.stock;
        existing.reservedStock += productWithInstanceId.reservedStock;
        if (productWithInstanceId.id && !existing.sourceIds?.includes(productWithInstanceId.id)) {
          existing.sourceIds = [...(existing.sourceIds || []), productWithInstanceId.id];
        }
      } else {
        productMap.set(key, { ...productWithInstanceId, sourceIds: productWithInstanceId.id ? [productWithInstanceId.id] : [] });
      }
    });

    return Array.from(productMap.values());
  }, [productsData]);


  useEffect(() => {
    if (companyDocRef) {
      const unsub = onSnapshot(companyDocRef, (doc) => {
        if (doc.exists()) {
          setCompanyData({ id: doc.id, ...doc.data() } as Company);
        }
      });
      return () => unsub();
    }
  }, [companyDocRef]);


  const businessStartDate = useMemo(() => {
    const live = (salesData || []).filter(isCountableSale);
    if (live.length === 0) return null;
    return live.reduce((earliest, currentSale) => {
      const currentDate = new Date(currentSale.date);
      return currentDate < earliest ? currentDate : earliest;
    }, new Date(live[0].date));
  }, [salesData]);


  const categorizeProductWithAI = async (productName: string): Promise<string | null> => {
    if (!productName || productName.trim().length === 0) return null;

    const existingCategories = catalogCategoriesData?.map(c => c.name) || [];

    // 1.º: sugestão local (produtos parecidos + palavras-chave) — instantânea, offline e sem custos.
    const local = categorizeLocally(productName, existingCategories, (productsData || []) as { name?: string; category?: string }[]);
    if (local) return local.category;

    // 2.º: só se não houver nenhuma pista local, pergunta ao Gemini (pode falhar — então não sugere nada).
    try {
      const fbToken = await auth.currentUser?.getIdToken();
      if (!fbToken) return null;

      const response = await fetch('/api/categorize-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${fbToken}`
        },
        body: JSON.stringify({
          productName,
          existingCategories
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na API de Categorização.');
      }

      const data = await response.json();
      return data.category || null;
    } catch (error) {
      console.error("Error categorizing product:", error);
      return null;
    }
  };


  useEffect(() => {
    const end = new Date();
    const start = subMonths(end, 5);
    const monthInterval = eachMonthOfInterval({ start, end });

    if (!salesData) {
      const emptyData = monthInterval.map(d => ({
        name: format(d, 'MMM', { locale: pt }).replace('.', ''),
        vendas: 0,
      }));
      setMonthlySalesChartData(emptyData);
      return;
    }

    const chartData = monthInterval.map(monthStart => {
      const monthSales = salesData?.filter(s => {
        if (!isCountableSale(s)) return false; // apagadas (lixeira) e cotações/pró-formas não contam
        const saleDate = new Date(s.date);
        return saleDate.getFullYear() === monthStart.getFullYear() && saleDate.getMonth() === monthStart.getMonth();
      }).reduce((sum, s) => sum + (s.amountPaid ?? s.totalValue), 0) || 0;

      const monthName = format(monthStart, 'MMM', { locale: pt });
      return {
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', ''),
        vendas: monthSales,
      };
    });
    setMonthlySalesChartData(chartData);

  }, [salesData]);


  const dashboardStats = useMemo(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const monthlySales = salesData?.filter(sale => {
      if (!isCountableSale(sale)) return false; // apagadas (lixeira) e cotações/pró-formas não contam
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    }) || [];

    const monthlySalesValue = monthlySales.reduce((sum, sale) => {
      return sum + (sale.amountPaid ?? sale.totalValue);
    }, 0);
    const monthlySalesCount = monthlySales.length;
    const averageTicket = monthlySalesCount > 0 ? monthlySalesValue / monthlySalesCount : 0;

    const totalInventoryValue = products?.reduce((sum, p) => sum + (p.stock * p.price), 0) || 0;
    const totalItemsInStock = products?.reduce((sum, p) => sum + p.stock, 0) || 0;

    const pendingOrders = ordersData?.filter(o => o.status === 'Pendente' && !o.deletedAt).length || 0;
    const readyForTransfer = productionsData?.filter(p => p.status === 'Concluído' && !p.deletedAt).length || 0;

    return {
      monthlySalesValue,
      averageTicket,
      totalInventoryValue,
      totalItemsInStock,
      pendingOrders,
      readyForTransfer,
    };
  }, [salesData, products, ordersData, productionsData]);


  const updateCompany = useCallback(async (details: Partial<Company>) => {
    if (companyDocRef) {
      updateDocumentNonBlocking(companyDocRef, details);
    }
  }, [companyDocRef]);
  return { user, setUser, firebaseUser, setFirebaseUser, companyId, setCompanyId, loading, setLoading, profilePicture, setProfilePicture, notifications, setNotifications, monthlySalesChartData, setMonthlySalesChartData, chatHistory, setChatHistory, router, toast, firestore, auth, wasSyncing, lastSaleTimestamp, setLastSaleTimestamp, companyData, setCompanyData, isReadOnly, isTrial, daysLeft, renewInDays, subscriptionReason, locations, isMultiLocation, postFeed, addNotification, markNotificationAsRead, markAllAsRead, clearNotifications, handleSetProfilePicture, sendPush, assertOnline, isManagerUser, notifyManagers, triggerEmailAlert, logout, canView, canEdit, productsCollectionRef, salesCollectionRef, productionsCollectionRef, ordersCollectionRef, stockMovementsCollectionRef, catalogProductsCollectionRef, catalogCategoriesCollectionRef, rawMaterialsCollectionRef, recipesCollectionRef, companyDocRef, productsData, productsLoading, salesData, salesLoading, productionsData, productionsLoading, ordersData, ordersLoading, stockMovementsData, stockMovementsLoading, catalogProductsData, catalogProductsLoading, catalogCategoriesData, catalogCategoriesLoading, rawMaterialsData, rawMaterialsLoading, recipesData, recipesLoading, products, businessStartDate, categorizeProductWithAI, dashboardStats, updateCompany };
}

export type InventoryCore = ReturnType<typeof useInventoryCore>;
