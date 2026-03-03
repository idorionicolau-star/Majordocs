'use client';


import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Product, Location, Sale, Production, ProductionLog, Order, Company, Employee, ModulePermission, PermissionLevel, StockMovement, AppNotification, DashboardStats, InventoryContextType, ChatMessage, RawMaterial, Recipe, CartItem, NotificationEmail } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase, getFirebaseAuth } from '@/firebase/provider';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseAuthUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  runTransaction,
  getDoc,
  serverTimestamp,
  arrayUnion,
  type CollectionReference,
  DocumentReference,
  limit,
  arrayRemove,
} from 'firebase/firestore';
import { allPermissions } from '@/lib/data';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { format, eachMonthOfInterval, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { downloadSaleDocument, formatCurrency, normalizeString } from '@/lib/utils';
import {
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking
} from '@/firebase/non-blocking-updates';
import { PasswordConfirmationDialog } from '@/components/auth/password-confirmation-dialog';


type CatalogProduct = Omit<
  Product,
  'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'
>;
type CatalogCategory = { id: string; name: string };

export const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined
);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

  const [companyData, setCompanyData] = useState<Company | null>(null);

  const locations = useMemo(() => companyData?.locations || [], [companyData]);
  const isMultiLocation = useMemo(() => !!companyData?.isMultiLocation, [companyData]);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'date' | 'read'>) => {
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

  const triggerEmailAlert = useCallback(async (payload: any) => {
    const settings = companyData?.notificationSettings;

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
      addNotification({
        type: notificationType,
        message: `Stock crítico para ${payload.productName}! Quantidade: ${payload.quantity}`,
        href: notificationHref,
      });
    } else if (isSaleEvent) {
      subject = `✅ Nova Venda: ${payload.productName}`;
      notificationHref = '/sales';
      notificationType = 'sale';
      addNotification({
        type: notificationType,
        message: `Nova venda de ${payload.productName} registada.`,
        href: notificationHref,
      });
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
  }, [companyData, addNotification, toast, auth]);

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
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userMapDocRef = doc(firestore, `users/${fbUser.uid}`);
        try {
          const userMapDoc = await getDoc(userMapDocRef);
          if (userMapDoc.exists()) {
            const userCompanyId = userMapDoc.data().companyId;
            setCompanyId(userCompanyId);
          } else {
            throw new Error("Mapeamento de utilizador não encontrado.");
          }
        } catch (error) {
          console.error("Error fetching user map:", error);
          logout();
        }
      } else {
        setUser(null);
        setFirebaseUser(null);
        setCompanyId(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
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
        } else {
          console.error("Perfil de funcionário não encontrado na empresa.");
          logout();
        }
        setLoading(false);
      }, (error) => {
        console.error("Error subscribing to employee data:", error);
        logout();
        setLoading(false);
      });
    } else if (!firebaseUser) {
      setLoading(false);
    }

    return () => unsubscribeEmployee();
  }, [firebaseUser, companyId, firestore, logout]);




  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return true;
    } catch (error: any) {
      console.error("Firebase Auth login error:", error);
      let message = "Ocorreu um erro ao fazer login.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Email ou senha inválidos.";
      }
      toast({ variant: 'destructive', title: 'Erro de Login', description: message });
      throw error;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Verify if the user exists in our users collection
      if (firestore) {
        const userDoc = await getDoc(doc(firestore, `users/${result.user.uid}`));
        if (!userDoc.exists()) {
          // User authenticated with Google but has no company mapping
          await auth.signOut();
          toast({
            variant: 'destructive',
            title: 'Conta não encontrada',
            description: 'Esta conta Google não está associada a nenhuma empresa. Por favor, faça o registo.'
          });
          return false;
        }
      }

      return true;
    } catch (error: any) {
      console.error("Google Auth login error:", error);
      let message = `Ocorreu um erro ao fazer login com o Google: ${error.message || error.code || 'Desconhecido'}`;
      if (error.code === 'auth/popup-closed-by-user') {
        message = "O login foi cancelado pelo utilizador.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "O login com Google não está activo nas configurações do sistema.";
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        message = "Já existe uma conta com este email. Faça login manualmente (Email/Senha).";
      } else if (error.code === 'auth/popup-blocked') {
        message = "O pop-up de login foi bloqueado. Por favor, permita pop-ups para este site.";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = "Este domínio não está autorizado na Firebase Console para o Google Auth.";
      }
      toast({ variant: 'destructive', title: 'Erro de Login', description: message });
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      const actionCodeSettings = {
        // URL you want to redirect back to. The domain (www.example.com) for this
        // URL must be whitelisted in the Firebase Console.
        url: window.location.origin + '/login',
        // This must be true.
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      toast({
        title: "E-mail de redefinição enviado",
        description: "Verifique a sua caixa de entrada para redefinir a sua senha.",
      });
    } catch (error: any) {
      console.error("Firebase Auth reset password error:", error);
      let message = "Ocorreu um erro ao enviar o e-mail de redefinição.";
      if (error.code === 'auth/user-not-found') {
        message = "Não encontramos nenhuma conta com este endereço de e-mail.";
      }
      toast({ variant: 'destructive', title: 'Erro', description: message });
      throw error;
    }
  };

  const changePassword = async (currentPass: string, newPass: string): Promise<boolean> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error("Utilizador não autenticado.");
      }

      // Reauthenticate first to satisfy "recent login" requirement
      const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPass);

      toast({
        title: "Senha alterada",
        description: "A sua senha foi alterada com sucesso.",
      });
      return true;
    } catch (error: any) {
      console.error("Firebase Auth change password error:", error);
      let message = "Ocorreu um erro ao alterar a senha.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "A senha atual está incorreta.";
      } else if (error.code === 'auth/weak-password') {
        message = "A nova senha tem de ter no mínimo 6 caracteres.";
      } else if (error.code === 'auth/requires-recent-login') {
        message = "Faça logout e login novamente antes de tentar alterar a senha.";
      }
      toast({ variant: 'destructive', title: 'Erro de Autenticação', description: message });
      return false;
    }
  };

  const registerCompany = async (companyName: string, adminUsername: string, adminEmail: string, adminPass: string, businessType: 'manufacturer' | 'reseller'): Promise<boolean> => {
    if (!firestore) return false;

    try {
      const companiesRef = collection(firestore, 'companies');
      const companyQuery = query(companiesRef, where('name', '==', companyName));
      const existingCompanySnapshot = await getDocs(companyQuery);
      if (!existingCompanySnapshot.empty) {
        throw new Error('Uma empresa com este nome já existe.');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
      const newUserId = userCredential.user.uid;

      const newCompanyRef = doc(companiesRef);

      const adminPermissions = allPermissions.reduce((acc, p) => {
        acc[p.id] = 'write';
        return acc;
      }, {} as Record<ModulePermission, PermissionLevel>);

      const employeesCollectionRef = collection(firestore, `companies/${newCompanyRef.id}/employees`);
      const newEmployeeRef = doc(employeesCollectionRef, newUserId);
      const userMapDocRef = doc(firestore, `users/${newUserId}`);

      const batch = writeBatch(firestore);

      batch.set(newEmployeeRef, {
        username: adminUsername,
        email: adminEmail,
        role: 'Admin',
        companyId: newCompanyRef.id,
        permissions: adminPermissions,
      });

      batch.set(userMapDocRef, { companyId: newCompanyRef.id });

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      batch.set(newCompanyRef, {
        name: companyName,
        ownerId: newUserId,
        isMultiLocation: false,
        locations: [],
        businessType,
        saleCounter: 0,
        status: 'trial',
        trialEndsAt: trialEndsAt.toISOString()
      });

      await batch.commit();

      try {
        const fbToken = await auth.currentUser?.getIdToken();
        await fetch('/api/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${fbToken}`
          },
          body: JSON.stringify({
            to: adminEmail,
            subject: '🎉 Bem-vindo ao MajorStockX!',
            type: 'WELCOME',
            companyName: companyName,
            companyId: newCompanyRef.id,
          }),
        });
      } catch (emailError) {
        console.warn("Falha ao enviar e-mail de boas-vindas, mas o registo foi bem-sucedido:", emailError);
      }

      return true;
    } catch (error: any) {
      console.error('Registration error: ', error);
      let message = 'Ocorreu um erro inesperado durante o registo.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Este endereço de email já está a ser utilizado.';
      } else if (error.message.includes('Uma empresa com este nome')) {
        message = error.message;
      }
      toast({ variant: 'destructive', title: 'Erro no Registo', description: message });
      return false;
    }
  };

  const registerCompanyWithGoogle = async (companyName: string, businessType: 'manufacturer' | 'reseller'): Promise<boolean> => {
    if (!firestore) return false;

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const newUserId = userCredential.user.uid;
      const adminEmail = userCredential.user.email || '';
      const adminUsername = userCredential.user.displayName || 'Admin';

      // Check if user already has a company
      const existingUserMap = await getDoc(doc(firestore, `users/${newUserId}`));
      if (existingUserMap.exists()) {
        await auth.signOut();
        toast({
          variant: 'destructive',
          title: 'Erro no Registo',
          description: 'Esta conta Google já está associada a uma empresa. Por favor, faça login em vez de se registar.'
        });
        return false;
      }

      const companiesRef = collection(firestore, 'companies');
      const companyQuery = query(companiesRef, where('name', '==', companyName));
      const existingCompanySnapshot = await getDocs(companyQuery);
      if (!existingCompanySnapshot.empty) {
        await auth.signOut();
        throw new Error('Uma empresa com este nome já existe.');
      }

      const newCompanyRef = doc(companiesRef);

      const adminPermissions = allPermissions.reduce((acc, p) => {
        acc[p.id] = 'write';
        return acc;
      }, {} as Record<ModulePermission, PermissionLevel>);

      const employeesCollectionRef = collection(firestore, `companies/${newCompanyRef.id}/employees`);
      const newEmployeeRef = doc(employeesCollectionRef, newUserId);
      const userMapDocRef = doc(firestore, `users/${newUserId}`);

      const batch = writeBatch(firestore);

      batch.set(newEmployeeRef, {
        username: adminUsername,
        email: adminEmail,
        role: 'Admin',
        companyId: newCompanyRef.id,
        permissions: adminPermissions,
      });

      batch.set(userMapDocRef, { companyId: newCompanyRef.id });

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      batch.set(newCompanyRef, {
        name: companyName,
        ownerId: newUserId,
        isMultiLocation: false,
        locations: [],
        businessType,
        saleCounter: 0,
        status: 'trial',
        trialEndsAt: trialEndsAt.toISOString()
      });

      await batch.commit();

      try {
        const fbToken = await auth.currentUser?.getIdToken();
        await fetch('/api/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${fbToken}`
          },
          body: JSON.stringify({
            to: adminEmail,
            subject: '🎉 Bem-vindo ao MajorStockX!',
            type: 'WELCOME',
            companyName: companyName,
            companyId: newCompanyRef.id,
          }),
        });
      } catch (emailError) {
        console.warn("Falha ao enviar e-mail de boas-vindas, mas o registo foi bem-sucedido:", emailError);
      }

      return true;
    } catch (error: any) {
      console.error('Registration with Google error: ', error);
      let message = `Erro inesperado: ${error.message || error.code || 'Desconhecido'}`;
      if (error.code === 'auth/popup-closed-by-user') {
        message = 'Registo com Google cancelado.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "O login com Google não está activo nas configurações do sistema.";
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        message = "Já existe uma conta com este email. Faça login manualmente (Email/Senha).";
      } else if (error.code === 'auth/popup-blocked') {
        message = "O pop-up de login foi bloqueado. Por favor, permita pop-ups para este site.";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = "Este domínio não está autorizado na Firebase Console para o Google Auth.";
      } else if (error.message?.includes('Uma empresa com este nome')) {
        message = error.message;
      }
      toast({ variant: 'destructive', title: 'Erro no Registo', description: message });
      return false;
    }
  };

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
    if (!salesData || salesData.length === 0) return null;
    return salesData.reduce((earliest, currentSale) => {
      const currentDate = new Date(currentSale.date);
      return currentDate < earliest ? currentDate : earliest;
    }, new Date(salesData[0].date));
  }, [salesData]);

  const categorizeProductWithAI = async (productName: string): Promise<string | null> => {
    if (!productName || productName.trim().length === 0) return null;

    try {
      const fbToken = await auth.currentUser?.getIdToken();
      if (!fbToken) return null;

      const existingCategories = catalogCategoriesData?.map(c => c.name) || [];

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
        if (s.documentType === 'Factura Proforma') return false;
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
      if (sale.documentType === 'Factura Proforma') return false;
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

    const pendingOrders = ordersData?.filter(o => o.status === 'Pendente').length || 0;
    const readyForTransfer = productionsData?.filter(p => p.status === 'Concluído').length || 0;

    return {
      monthlySalesValue,
      averageTicket,
      totalInventoryValue,
      totalItemsInStock,
      pendingOrders,
      readyForTransfer,
    };
  }, [salesData, products, ordersData, productionsData]);


  const checkStockAndNotify = useCallback(async (product: Product) => {
    const settings = companyData?.notificationSettings;
    const availableStock = product.stock - (product.reservedStock || 0);

    const isCritical = availableStock <= (product.criticalStockThreshold || 0);

    // If not critical, we stop
    if (!isCritical) {
      return;
    }

    // Handle legacy settings and new multi-email configuration
    let hasCriticalEmailConfigured = false;

    if (settings?.emails && Array.isArray(settings.emails)) {
      hasCriticalEmailConfigured = settings.emails.some(e => e.onCriticalStock && e.email.trim() !== '');
    } else if (settings?.email && settings.onCriticalStock) {
      hasCriticalEmailConfigured = settings.email.trim() !== '';
    }

    if (!hasCriticalEmailConfigured) {
      toast({
        variant: "destructive",
        title: "E-mail de Notificação em Falta",
        description: `O produto ${product.name} está com stock crítico, mas não há um e-mail configurado para alertas críticos nos Ajustes.`,
      });
      return;
    }

    await triggerEmailAlert({
      type: 'CRITICAL',
      productName: product.name,
      quantity: availableStock,
      location: locations.find(l => l.id === product.location)?.name || 'Principal',
      threshold: product.criticalStockThreshold,
    });
  }, [companyData, locations, triggerEmailAlert, toast]);

  const addProduct = useCallback(
    (newProductData: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock' | 'sourceIds'>) => {
      if (!productsCollectionRef || !firestore || !user || !companyId) return Promise.resolve();

      const { name, location, stock: newStock } = newProductData;

      const processAdd = async () => {
        try {
          // 1. Move Robust Check and Query OUTSIDE the transaction
          let existingProductId: string | null = null;

          if (productsData) {
            const normalizedNewName = normalizeString(name);
            const targetLoc = location || "";

            const match = productsData.find(p =>
              normalizeString(p.name) === normalizedNewName &&
              (p.location === targetLoc || (!p.location && !targetLoc))
            );

            if (match) {
              existingProductId = match.id || null;
            }
          }

          if (!existingProductId) {
            const q = query(productsCollectionRef, where("name", "==", name), where("location", "==", location || ""));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              existingProductId = querySnapshot.docs[0].id;
            }
          }

          let finalProductId: string | null = null;

          await runTransaction(firestore, async (transaction) => {
            // 2. READ FIRST
            const docRef = existingProductId ? doc(productsCollectionRef as CollectionReference, existingProductId) : doc(productsCollectionRef as CollectionReference);
            const existingDocSnap = await transaction.get(docRef);
            const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

            // 3. APPLY LOGIC AND WRITE LAST
            if (existingDocSnap.exists()) {
              finalProductId = docRef.id;
              const existingData = existingDocSnap.data() as Product;
              const oldStock = existingData.stock || 0;
              const updateData: Record<string, any> = { stock: oldStock + newStock, lastUpdated: new Date().toISOString(), deletedAt: null };
              // Preserve imageUrl if provided with the new product data
              if (newProductData.imageUrl) {
                updateData.imageUrl = newProductData.imageUrl;
              }
              transaction.update(docRef, updateData);
            } else {
              const newProduct: Omit<Product, 'id' | 'instanceId' | 'sourceIds'> = {
                ...newProductData,
                lastUpdated: new Date().toISOString(),
                reservedStock: 0,
              };
              transaction.set(docRef, newProduct);
              finalProductId = docRef.id;
            }

            const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
              productId: finalProductId!,
              productName: name,
              type: 'IN',
              quantity: newStock,
              toLocationId: location,
              reason: existingDocSnap.exists() ? `Entrada de novo lote (Match)` : `Criação de novo produto`,
              userId: user.id,
              userName: user.username,
            };
            const movementDocRef = doc(movementsRef as CollectionReference);
            transaction.set(movementDocRef, { ...movement, timestamp: serverTimestamp() });
          });


          addNotification({
            type: 'production',
            message: `Inventário atualizado para: ${name}`,
            href: '/inventory',
          });

        } catch (error) {
          console.error("Failed to add/update product:", error);
          toast({
            variant: "destructive",
            title: "Erro ao atualizar inventário",
            description: "Não foi possível guardar as alterações.",
          });
        }
      };

      return processAdd();
    },
    [productsCollectionRef, firestore, user, companyId, addNotification, toast]
  );

  const updateProduct = useCallback(async (instanceId: string, updatedData: Partial<Product>) => {
    if (!productsCollectionRef || !instanceId || !firestore) return;

    const productToUpdate = products.find(p => p.instanceId === instanceId);
    if (!productToUpdate || !productToUpdate.sourceIds) return;

    const batch = writeBatch(firestore);
    const { stock, ...restOfData } = updatedData;

    // Remove undefined values to prevent Firestore errors
    const safeData = Object.entries(restOfData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    productToUpdate.sourceIds.forEach(id => {
      const docRef = doc(productsCollectionRef, id);
      batch.update(docRef, { ...safeData, lastUpdated: new Date().toISOString() });
    });

    if (stock !== undefined) {
      const firstDocRef = doc(productsCollectionRef as CollectionReference, productToUpdate.sourceIds[0]);
      batch.update(firstDocRef, { stock });

      for (let i = 1; i < productToUpdate.sourceIds.length; i++) {
        const otherDocRef = doc(productsCollectionRef as CollectionReference, productToUpdate.sourceIds[i]);
        batch.update(otherDocRef, { stock: 0, reservedStock: 0 });
      }
    }

    await batch.commit();

    const fullProduct = products.find(p => p.id === instanceId);
    if (fullProduct) {
      const productForNotification = { ...fullProduct, ...updatedData };
      checkStockAndNotify(productForNotification);
    }
  }, [productsCollectionRef, products, checkStockAndNotify, firestore]);

  const deleteProduct = useCallback(async (instanceId: string) => {
    if (!productsCollectionRef || !instanceId || !firestore || !user) return;
    const productToDelete = products.find(p => p.instanceId === instanceId);
    if (!productToDelete) return;

    const batch = writeBatch(firestore);

    const idsToDelete = productToDelete.sourceIds && productToDelete.sourceIds.length > 0
      ? productToDelete.sourceIds
      : [productToDelete.id || instanceId];

    idsToDelete.forEach(id => {
      if (id) {
        const docRef = doc(productsCollectionRef as CollectionReference, id);
        batch.update(docRef, {
          deletedAt: new Date().toISOString(),
          deletedBy: user.username
        });
      }
    });

    try {
      await batch.commit();
      toast({ title: 'Produto movido para a Lixeira', description: 'Pode restaurá-lo nas Definições.' });
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({ variant: 'destructive', title: 'Erro ao apagar', description: 'Tente novamente.' });
    }
  }, [productsCollectionRef, products, firestore, user, toast]);

  const clearProductsCollection = useCallback(async () => {
    if (!productsCollectionRef || !firestore || !user) return;
    const batch = writeBatch(firestore);
    let count = 0;

    products.forEach(product => {
      const idsToDelete = product.sourceIds && product.sourceIds.length > 0
        ? product.sourceIds
        : [product.id || product.instanceId];

      idsToDelete.forEach(id => {
        if (id) {
          const docRef = doc(productsCollectionRef as CollectionReference, id);
          batch.update(docRef, {
            deletedAt: new Date().toISOString(),
            deletedBy: user.username
          });
          count++;
        }
      });
    });

    if (count === 0) return;

    try {
      await batch.commit();
      toast({
        title: "Inventário Limpo",
        description: `${count} produtos movidos para a lixeira.`,
      });
    } catch (error) {
      console.error("Error clearing inventory:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Limpar",
        description: "Não foi possível limpar o inventário.",
      });
    }
  }, [productsCollectionRef, products, firestore, user, toast]);

  const auditStock = useCallback(async (product: Product, physicalCount: number, reason: string) => {
    console.log("auditStock called", { product, physicalCount, reason, firestore: !!firestore, companyId, user: !!user });

    if (!firestore) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro de conexão: Firestore não disponível.' });
      return;
    }
    if (!companyId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro de sessão: ID da empresa em falta.' });
      return;
    }
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro de sessão: Utilizador não identificado.' });
      return;
    }
    if (!product.id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Produto inválido: ID em falta.' });
      return;
    }

    const productRef = doc(firestore, `companies/${companyId}/products`, product.id);
    const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

    const systemCountBefore = product.stock;
    const adjustment = physicalCount - systemCountBefore;

    // If adjustment is 0, we still log the audit confirmation.
    if (adjustment === 0) {
      // toast({ title: 'Stock Verificado', description: 'A contagem física confirma o stock do sistema.' });
      // Proceed to log
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        // 1. READ FIRST
        const pSnap = await transaction.get(productRef);
        if (!pSnap.exists()) {
          throw new Error("Produto não encontrado na base de dados para auditoria.");
        }
        const freshData = pSnap.data() as Product;
        const currentSystemStock = freshData.stock || 0;
        const realAdjustment = physicalCount - currentSystemStock;

        // 2. WRITE LAST
        transaction.update(productRef, { stock: physicalCount, lastUpdated: new Date().toISOString() });

        const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
          productId: product.id!,
          productName: product.name,
          type: 'ADJUSTMENT',
          quantity: realAdjustment,
          toLocationId: product.location,
          reason: reason,
          userId: user.id,
          userName: user.username,
          isAudit: true,
          systemCountBefore: currentSystemStock,
          physicalCount: physicalCount,
        };
        transaction.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });

        // Use fresh data for post-transaction logic
        checkStockAndNotify({ ...freshData, stock: physicalCount });
      });

      toast({ title: 'Auditoria Concluída', description: `O stock de ${product.name} foi ajustado.` });

    } catch (error) {
      console.error('Audit transaction failed: ', error);
      toast({ variant: 'destructive', title: 'Erro na Auditoria', description: (error as Error).message });
    }

  }, [firestore, companyId, user, toast, checkStockAndNotify]);

  const transferStock = useCallback(async (productName: string, fromLocationId: string, toLocationId: string, quantity: number) => {
    if (!firestore || !companyId || !user) return;

    const fromProduct = products.find(p => p.name === productName && p.location === fromLocationId);
    if (!fromProduct || !fromProduct.id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Produto de origem não encontrado.' });
      return;
    }
    if (fromProduct.stock - fromProduct.reservedStock < quantity) {
      toast({ variant: 'destructive', title: 'Stock Insuficiente', description: `Disponível: ${fromProduct.stock - fromProduct.reservedStock}` });
      return;
    }

    const toProduct = products.find(p => p.name === productName && p.location === toLocationId);

    try {
      await runTransaction(firestore, async (transaction) => {
        const productsRef = collection(firestore, `companies/${companyId}/products`);
        const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

        const fromDocRef = doc(productsRef, fromProduct.id!);
        const toDocRef = toProduct?.id ? doc(productsRef, toProduct.id) : doc(productsRef);

        // 1. READ ALL FIRST
        const fromSnap = await transaction.get(fromDocRef);
        const toSnap = toProduct?.id ? await transaction.get(toDocRef) : null;

        if (!fromSnap.exists()) {
          throw new Error("Produto de origem não encontrado na base de dados.");
        }

        const freshFromData = fromSnap.data() as Product;
        const freshToData = toSnap?.exists() ? toSnap.data() as Product : null;

        // 2. VALIDATE AND CALCULATE
        if ((freshFromData.stock || 0) < quantity) {
          throw new Error(`Stock insuficiente em ${fromLocationId}. Disponível: ${freshFromData.stock}`);
        }

        const newFromStock = freshFromData.stock - quantity;

        // 3. WRITE ALL LAST
        transaction.update(fromDocRef, { stock: newFromStock, lastUpdated: new Date().toISOString() });

        if (freshToData) {
          transaction.update(toDocRef, { stock: (freshToData.stock || 0) + quantity, lastUpdated: new Date().toISOString() });
        } else {
          const { id, instanceId, stock, reservedStock, location: _, lastUpdated: __, ...restOfProduct } = freshFromData;
          transaction.set(toDocRef, {
            ...restOfProduct,
            location: toLocationId,
            stock: quantity,
            reservedStock: 0,
            lastUpdated: new Date().toISOString()
          });
        }

        const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
          productId: fromProduct.id!,
          productName,
          type: 'TRANSFER',
          quantity,
          fromLocationId,
          toLocationId,
          reason: `Transferência manual`,
          userId: user.id,
          userName: user.username,
        };
        transaction.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });

        // Side effect post-transaction logic
        checkStockAndNotify({ ...freshFromData, stock: newFromStock });
      });


      toast({ title: 'Transferência Concluída' });
    } catch (error) {
      console.error('Error transferring stock:', error);
      toast({ variant: 'destructive', title: 'Erro na Transferência', description: (error as Error).message });
    }
  }, [firestore, companyId, user, products, toast, checkStockAndNotify]);





  const updateProductStock = useCallback(async (productName: string, quantity: number, locationId?: string) => {
    if (!firestore || !companyId || !user) return;
    const targetLocation = locationId || (isMultiLocation && locations.length > 0 ? locations[0].id : 'Principal');
    const catalogProduct = catalogProductsData?.find(p => p.name === productName);
    const existingInstance = products.find(p => p.name === productName && p.location === targetLocation);

    const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

    try {
      await runTransaction(firestore, async (transaction) => {
        let docRef: DocumentReference;
        let freshData: Product | null = null;
        const productsRef = collection(firestore, `companies/${companyId}/products`);

        if (existingInstance && existingInstance.id) {
          docRef = doc(productsRef, existingInstance.id);
          const pSnap = await transaction.get(docRef);
          if (pSnap.exists()) {
            freshData = pSnap.data() as Product;
          }
        } else {
          docRef = doc(productsRef);
        }

        if (freshData) {
          const newStock = (freshData.stock || 0) + quantity;
          transaction.update(docRef, { stock: newStock, lastUpdated: new Date().toISOString() });
          checkStockAndNotify({ ...freshData, stock: newStock });
        } else {
          let productDataToUse: any = {};
          if (catalogProduct) {
            const { id, ...rest } = catalogProduct;
            productDataToUse = rest;
          } else {
            const blueprint = products.find(p => p.name === productName);
            if (blueprint) {
              const { id, instanceId, stock, reservedStock, location, lastUpdated, ...rest } = blueprint;
              productDataToUse = rest;
            } else {
              productDataToUse = { name: productName, category: 'Geral', price: 0, unit: 'un', lowStockThreshold: 5, criticalStockThreshold: 2 };
            }
          }

          transaction.set(docRef, {
            ...productDataToUse,
            stock: quantity,
            reservedStock: 0,
            location: targetLocation,
            lastUpdated: new Date().toISOString()
          });
        }

        const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
          productId: docRef.id,
          productName,
          type: 'IN',
          quantity,
          toLocationId: targetLocation,
          reason: freshData ? `Produção de Lote: ${quantity} unidades` : `Início de Produção: ${quantity} unidades`,
          userId: user.id,
          userName: user.username,
        };
        transaction.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });
      });
    } catch (e: any) {
      console.error("Error updating product stock:", e);
      toast({ variant: 'destructive', title: 'Erro ao Atualizar Stock', description: e.message });
    }


    addNotification({
      type: 'production',
      message: `${quantity} unidades de ${productName} foram produzidas.`,
      href: '/production',
    });
  }, [firestore, companyId, products, catalogProductsData, isMultiLocation, locations, toast, user, checkStockAndNotify, addNotification]);

  const updateCompany = useCallback(async (details: Partial<Company>) => {
    if (companyDocRef) {
      updateDocumentNonBlocking(companyDocRef, details);
    }
  }, [companyDocRef]);

  const addSale = useCallback(async (newSaleData: Omit<Sale, 'id' | 'guideNumber'>, reserveStock = true) => {
    if (!firestore || !companyId || !productsCollectionRef) throw new Error("Firestore não está pronto.");

    const settings = companyData?.notificationSettings;
    if (settings?.onSale && (!settings.email || settings.email.trim() === '')) {
      toast({
        variant: "destructive",
        title: "E-mail de Notificação em Falta",
        description: "Ativou as notificações de venda, mas não configurou um e-mail de destino nos Ajustes.",
      });
    }

    const productQuery = query(
      productsCollectionRef,
      where("name", "==", newSaleData.productName),
      where("location", "==", newSaleData.location || (isMultiLocation ? locations[0]?.id : 'Principal'))
    );

    const salesCollectionRef = collection(firestore, `companies/${companyId}/sales`);
    const newSaleRef = doc(salesCollectionRef);
    const companyDocRef = doc(firestore, `companies/${companyId}`);

    let guideNumberForOuterScope: string | null = null;

    const isProforma = newSaleData.documentType === 'Factura Proforma';
    const shouldReserveStock = reserveStock && !isProforma;
    const finalStatus = isProforma ? 'Pendente' : newSaleData.status;

    // This is a read outside the transaction to get the document reference.
    const productSnapshot = shouldReserveStock ? await getDocs(productQuery) : null;
    if (shouldReserveStock && productSnapshot && productSnapshot.empty) {
      throw new Error(`Produto "${newSaleData.productName}" não encontrado no estoque para a localização selecionada.`);
    }
    const productDocRef = productSnapshot ? productSnapshot.docs[0].ref : null;

    await runTransaction(firestore, async (transaction) => {
      const companyDoc = await transaction.get(companyDocRef);
      if (!companyDoc.exists()) {
        throw new Error("Documento da empresa não encontrado.");
      }
      const currentCompanyData = companyDoc.data();
      const allNumbering = currentCompanyData.documentNumbering || {};
      const typeConfig = allNumbering[newSaleData.documentType];
      const newSaleCounter = (currentCompanyData.saleCounter || 0) + 1;

      let guideNumber: string;
      if (typeConfig && typeConfig.prefix) {
        const num = typeConfig.nextNumber || 1;
        const padded = typeConfig.padding > 0 ? String(num).padStart(typeConfig.padding, '0') : String(num);
        guideNumber = `${typeConfig.prefix}${typeConfig.separator || ''}${padded}`;
      } else {
        guideNumber = `GT-${String(newSaleCounter).padStart(6, '0')}`;
      }
      guideNumberForOuterScope = guideNumber;

      let unitCost = 0;
      if (productDocRef) {
        const productDoc = await transaction.get(productDocRef as DocumentReference);
        if (productDoc.exists()) {
          const productData = productDoc.data() as Product;
          unitCost = productData.cost || 0;

          if (shouldReserveStock) {
            const availableStock = productData.stock - productData.reservedStock;
            if (availableStock < newSaleData.quantity) {
              throw new Error(`Estoque insuficiente. Disponível: ${availableStock}.`);
            }
            const newReservedStock = productData.reservedStock + newSaleData.quantity;
            transaction.update(productDoc.ref, { reservedStock: newReservedStock });
          }
        }
      }

      transaction.update(companyDocRef, {
        saleCounter: newSaleCounter,
        ...(typeConfig && typeConfig.prefix ? { [`documentNumbering.${newSaleData.documentType}.nextNumber`]: (typeConfig.nextNumber || 1) + 1 } : {})
      });
      transaction.set(newSaleRef, { ...newSaleData, status: finalStatus, guideNumber, unitCost });
    });

    if (guideNumberForOuterScope) {
      const createdSale: Sale = {
        ...newSaleData,
        id: newSaleRef.id,
        guideNumber: guideNumberForOuterScope,
      };
      downloadSaleDocument(createdSale, companyData);

      await triggerEmailAlert({
        type: 'SALE',
        ...newSaleData,
        guideNumber: guideNumberForOuterScope,
        location: locations.find(l => l.id === newSaleData.location)?.name || 'Principal',
      });

      // Trigger stock alert check after sale
      if (productDocRef) {
        getDoc(productDocRef as DocumentReference).then(docSnap => {
          if (docSnap.exists()) {
            checkStockAndNotify(docSnap.data() as Product);
          }
        });
      }
    }

    setLastSaleTimestamp(Date.now());
  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations, companyData, toast, triggerEmailAlert]);

  const addBulkSale = useCallback(async (
    items: CartItem[],
    saleData: {
      customerId?: string;
      clientName?: string;
      documentType: Sale['documentType'];
      notes?: string;
      discount?: { type: 'fixed' | 'percentage'; value: number };
      applyVat: boolean;
      vatPercentage: number;
    }
  ) => {
    if (!firestore || !companyId || !productsCollectionRef || !user) throw new Error("Firestore não está pronto.");
    if (!items || items.length === 0) throw new Error("O carrinho está vazio.");

    const salesCollectionRef = collection(firestore, `companies/${companyId}/sales`);
    const companyDocRef = doc(firestore, `companies/${companyId}`);

    let guideNumberForOuterScope: string | null = null;
    let createdSalesForOuterScope: Sale[] = [];

    // Calculate totals for proportional distribution
    const cartSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDiscountAmount = saleData.discount
      ? (saleData.discount.type === 'percentage' ? cartSubtotal * (saleData.discount.value / 100) : saleData.discount.value)
      : 0;
    const totalAfterDiscount = Math.max(0, cartSubtotal - totalDiscountAmount);
    const totalVatAmount = saleData.applyVat ? totalAfterDiscount * (saleData.vatPercentage / 100) : 0;
    const cartTotal = totalAfterDiscount + totalVatAmount;

    // To deduct across multiple source documents, we need all relevant products.
    // We already have `products` aggregated from the query. Let's just use the sourceIds!
    // But we are in a transaction, so we must read the raw docs.
    const allSourceIds = new Set<string>();
    items.forEach(item => {
      const targetLoc = item.location || (isMultiLocation && locations.length > 0 ? locations[0]?.id : 'Principal');
      const aggregatedProduct = products.find(p =>
        p.name === item.productName &&
        (!isMultiLocation || p.location === targetLoc || (!p.location && (targetLoc === 'Principal' || !item.location)))
      );

      if (aggregatedProduct?.sourceIds) {
        aggregatedProduct.sourceIds.forEach(id => allSourceIds.add(id));
      } else if (item.productId) {
        allSourceIds.add(item.productId);
      }
    });

    await runTransaction(firestore, async (transaction) => {
      // 1. READS
      const companyDoc = await transaction.get(companyDocRef);
      if (!companyDoc.exists()) throw new Error("Empresa não encontrada.");

      const sourceDocRefs = Array.from(allSourceIds).map(id => doc(productsCollectionRef, id));
      const sourceSnaps = await Promise.all(sourceDocRefs.map(ref => transaction.get(ref)));

      const loadedProducts = sourceSnaps.filter(s => s.exists()).map(s => ({ id: s.id, ref: s.ref, data: s.data() as Product }));

      // 2. VALIDATION & LOGIC
      const currentCompanyData = companyDoc.data();
      const allBulkNumbering = currentCompanyData.documentNumbering || {};
      const bulkTypeConfig = allBulkNumbering[saleData.documentType];
      const newSaleCounter = (currentCompanyData.saleCounter || 0) + 1;

      let guideNumber: string;
      if (bulkTypeConfig && bulkTypeConfig.prefix) {
        const num = bulkTypeConfig.nextNumber || 1;
        const padded = bulkTypeConfig.padding > 0 ? String(num).padStart(bulkTypeConfig.padding, '0') : String(num);
        guideNumber = `${bulkTypeConfig.prefix}${bulkTypeConfig.separator || ''}${padded}`;
      } else {
        guideNumber = `GT-${String(newSaleCounter).padStart(6, '0')}`;
      }
      guideNumberForOuterScope = guideNumber;

      const salesToCreate: Sale[] = [];
      const productUpdates: { ref: DocumentReference; data: any }[] = [];

      items.forEach((item, index) => {
        const isProforma = saleData.documentType === 'Factura Proforma';

        let remainingQuantityToDeduct = item.quantity;
        // Find all underlying documents for this item's name and location
        const targetLocation = item.location || (isMultiLocation && locations.length > 0 ? locations[0]?.id : 'Principal');
        const availableSources = loadedProducts.filter(p =>
          p.data.name === item.productName &&
          (!isMultiLocation || p.data.location === targetLocation || (!p.data.location && (targetLocation === 'Principal' || !item.location)))
        );

        const totalAvailableStock = availableSources.reduce((sum, p) => sum + (p.data.stock - p.data.reservedStock), 0);

        if (!isProforma && totalAvailableStock < item.quantity) {
          throw new Error(`Stock insuficiente para "${item.productName}". Disponível: ${totalAvailableStock}.`);
        }

        if (!isProforma) {
          // Deduct from sources
          for (const source of availableSources) {
            if (remainingQuantityToDeduct <= 0) break;
            const availableInSource = source.data.stock - source.data.reservedStock;
            if (availableInSource > 0) {
              const deductAmount = Math.min(availableInSource, remainingQuantityToDeduct);
              source.data.reservedStock += deductAmount; // update local memory for subsequent items just in case
              remainingQuantityToDeduct -= deductAmount;

              // We might push multiple updates for the same ref if we are not careful
              const existingUpdate = productUpdates.find(u => u.ref.id === source.ref.id);
              if (existingUpdate) {
                existingUpdate.data.reservedStock = source.data.reservedStock;
              } else {
                productUpdates.push({
                  ref: source.ref,
                  data: { reservedStock: source.data.reservedStock, lastUpdated: new Date().toISOString() }
                });
              }
            }
          }
        }

        // Proportional math for this specific Sale document
        const proportion = cartSubtotal > 0 ? (item.subtotal / cartSubtotal) : 0;
        const itemDiscount = totalDiscountAmount * proportion;
        const itemVat = totalVatAmount * proportion;
        const itemTotal = item.subtotal - itemDiscount + itemVat;

        const newSaleRef = doc(salesCollectionRef); // Auto-ID
        const sale: Sale = {
          id: newSaleRef.id,
          guideNumber,
          productId: item.productId, // primary id reference
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitCost: item.originalCost || 0,
          subtotal: item.subtotal,
          discount: itemDiscount,
          vat: itemVat,
          totalValue: itemTotal,
          amountPaid: saleData.documentType !== 'Factura Proforma' ? itemTotal : 0,
          date: new Date().toISOString(),
          status: saleData.documentType === 'Factura Proforma' ? 'Pendente' : 'Pago',
          paymentMethod: 'Numerário',
          location: targetLocation,
          unit: item.unit || 'un',
          soldBy: user.username,
          documentType: saleData.documentType,
          clientName: saleData.clientName || '',
          ...(saleData.customerId && { customerId: saleData.customerId }),
          ...(saleData.notes && { notes: saleData.notes }),
        };

        salesToCreate.push(sale);
        createdSalesForOuterScope.push(sale);
      });

      // 3. WRITES
      transaction.update(companyDocRef, {
        saleCounter: newSaleCounter,
        ...(bulkTypeConfig && bulkTypeConfig.prefix ? { [`documentNumbering.${saleData.documentType}.nextNumber`]: (bulkTypeConfig.nextNumber || 1) + 1 } : {})
      });

      productUpdates.forEach(update => {
        transaction.update(update.ref, update.data);
      });

      salesToCreate.forEach(sale => {
        transaction.set(doc(salesCollectionRef, sale.id), sale);
      });
    });

    // Post-transaction UI/Notifications
    if (guideNumberForOuterScope && createdSalesForOuterScope.length > 0) {
      toast({
        title: "Venda Registada!",
        description: `Guia ${guideNumberForOuterScope} gerada com ${items.length} itens.`,
      });
      // Try to download single document with all sales
      downloadSaleDocument(createdSalesForOuterScope, companyData);

      await triggerEmailAlert({
        type: 'SALE',
        ...createdSalesForOuterScope[0], // Use first for email alert properties like status/clientName
        totalValue: cartTotal, // overriding total for single sum
        guideNumber: guideNumberForOuterScope,
        location: locations.find(l => l.id === createdSalesForOuterScope[0].location)?.name || 'Principal',
      });

      // Trigger stock alert checks for all items in bulk sale using fresh data
      items.forEach(item => {
        const targetLocation = item.location || (isMultiLocation && locations.length > 0 ? locations[0]?.id : 'Principal');
        const pQuery = query(
          productsCollectionRef,
          where("name", "==", item.productName),
          where("location", "==", targetLocation),
          limit(1)
        );
        getDocs(pQuery).then(snap => {
          if (!snap.empty) {
            checkStockAndNotify(snap.docs[0].data() as Product);
          }
        });
      });
    }

    setLastSaleTimestamp(Date.now());
  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations, companyData, products, toast, triggerEmailAlert]);

  const syncSmartThresholds = useCallback(async (isManual = false) => {
    if (!firestore || !companyId || !productsData || !stockMovementsData) return;

    if (!isManual) {
      const lastSync = localStorage.getItem(`majorstockx_last_smart_sync_${companyId}`);
      if (lastSync) {
        const _3daysInMs = 3 * 24 * 60 * 60 * 1000;
        if (Date.now() - parseInt(lastSync, 10) < _3daysInMs) {
          return; // Skip if less than 3 days ago
        }
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Filter recent movements and sales for the API
    const recentMovements = stockMovementsData.filter(m => {
      if (m.type !== 'OUT') return false;
      const ts = m.timestamp;
      let moveDate: Date | null = null;
      if (ts) {
        if (typeof (ts as any).toDate === 'function') {
          moveDate = (ts as any).toDate();
        } else if (typeof (ts as any).seconds === 'number') {
          moveDate = new Date((ts as any).seconds * 1000);
        } else {
          moveDate = new Date(ts as any);
        }
      }

      // If we cannot parse it, keep it and let Python try its best
      if (!moveDate || isNaN(moveDate.getTime())) return true;
      return moveDate >= thirtyDaysAgo;
    });

    const recentSales = salesData?.filter(s => {
      const saleDate = new Date(s.date);
      return !isNaN(saleDate.getTime()) && saleDate >= thirtyDaysAgo;
    }) || [];

    try {
      const response = await fetch('/api/predict-inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: productsData,
          movements: recentMovements,
          sales: recentSales
        })
      });

      if (!response.ok) {
        throw new Error("Erro de resposta do servidor da API Preditiva.");
      }

      const { success, predictions, error } = await response.json();

      if (!success || !predictions) {
        console.error("AI Prediction failed:", error);
        return;
      }

      const batch = writeBatch(firestore);
      let updatesCount = 0;

      predictions.forEach((pred: any) => {
        const p = productsData.find(prod => prod.id === pred.id);
        if (!p || p.thresholdMode === 'manual') return;

        const hasSignificantChange =
          p.criticalStockThreshold !== pred.criticalStockThreshold ||
          p.lowStockThreshold !== pred.lowStockThreshold ||
          p.ads !== pred.ads ||
          p.targetStock !== pred.targetStock;

        if (hasSignificantChange && p.id) {
          batch.update(doc(firestore, 'companies', companyId, 'products', p.id), {
            criticalStockThreshold: pred.criticalStockThreshold,
            lowStockThreshold: pred.lowStockThreshold,
            ads: pred.ads,
            targetStock: pred.targetStock,
            lastUpdated: new Date().toISOString()
          });
          updatesCount++;
        }
      });

      if (updatesCount > 0) {
        await batch.commit();
        console.log(`Smart Thresholds updated via AI for ${updatesCount} products.`);
      }
    } catch (error) {
      console.error("Falha ao rodar sincronização inteligente:", error);
    }

    localStorage.setItem(`majorstockx_last_smart_sync_${companyId}`, Date.now().toString());
  }, [firestore, companyId, productsData, stockMovementsData]);

  const confirmSalePickup = useCallback(async (sale: Sale) => {
    if (!firestore || !companyId || !productsCollectionRef || !user) throw new Error("Firestore não está pronto.");

    const saleRef = doc(firestore, `companies/${companyId}/sales`, sale.id);
    const saleSnap = await getDoc(saleRef);
    if (!saleSnap.exists()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Venda não encontrada.' });
      return;
    }
    const freshSale = saleSnap.data() as Sale;

    if (freshSale.status === 'Levantado') {
      toast({
        title: "Já Levantado",
        description: "Esta venda já foi marcada como levantada. O stock não foi alterado.",
      });
      return;
    }

    const amountPaid = freshSale.amountPaid ?? 0;
    if ((freshSale.totalValue - amountPaid) > 0.5) {
      toast({
        variant: "destructive",
        title: 'Pagamento Incompleto',
        description: `Não é possível confirmar o levantamento. O cliente ainda precisa de pagar ${formatCurrency(freshSale.totalValue - amountPaid)}.`,
        duration: 6000,
      });
      return;
    }

    const targetLocation = freshSale.location || (isMultiLocation ? locations[0]?.id : 'Principal');
    const aggregatedProduct = products.find(p =>
      p.name === freshSale.productName &&
      (!isMultiLocation || p.location === targetLocation || (!p.location && (targetLocation === 'Principal' || !freshSale.location)))
    );

    let sourceIdsToCheck: string[] = [];
    if (aggregatedProduct?.sourceIds && aggregatedProduct.sourceIds.length > 0) {
      sourceIdsToCheck = aggregatedProduct.sourceIds;
    } else if (freshSale.productId) {
      sourceIdsToCheck = [freshSale.productId];
    } else {
      // Fallback query if not in context
      const productQuery = query(
        productsCollectionRef,
        where("name", "==", freshSale.productName),
        where("location", "==", targetLocation)
      );
      const snap = await getDocs(productQuery);
      if (!snap.empty) {
        sourceIdsToCheck = snap.docs.map(d => d.id);
      }
    }

    if (sourceIdsToCheck.length === 0) {
      throw new Error(`Produto "${freshSale.productName}" não encontrado para atualizar estoque.`);
    }

    await runTransaction(firestore, async (transaction) => {
      // 1. READS
      const sourceDocRefs = sourceIdsToCheck.map(id => doc(productsCollectionRef, id));
      const sourceSnaps = await Promise.all(sourceDocRefs.map(ref => transaction.get(ref)));

      const loadedProducts = sourceSnaps.filter(s => s.exists()).map(s => ({ ref: s.ref, data: s.data() as Product }));

      if (loadedProducts.length === 0) {
        throw new Error(`Produto "${freshSale.productName}" não encontrado na base de dados.`);
      }

      // Check total available BEFORE deducting
      const totalStock = loadedProducts.reduce((sum, p) => sum + p.data.stock, 0);
      if (totalStock < freshSale.quantity) {
        throw new Error(`Erro Crítico: Stock insuficiente para realizar o levantamento. Disp: ${totalStock}, Necessário: ${freshSale.quantity}`);
      }

      // 2. CALCULATIONS & WRITES
      let remainingToDeduct = freshSale.quantity;
      const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

      for (const source of loadedProducts) {
        if (remainingToDeduct <= 0) break;

        // Prefer deducting from products that have reserved stock first
        const availableInSource = source.data.stock;
        if (availableInSource > 0) {
          const deductAmount = Math.min(availableInSource, remainingToDeduct);

          let newStock = source.data.stock - deductAmount;
          let newReservedStock = source.data.reservedStock - deductAmount;

          if (newReservedStock < 0) {
            newReservedStock = 0;
          }

          transaction.update(source.ref, { stock: newStock, reservedStock: newReservedStock, lastUpdated: new Date().toISOString() });

          // Movement log per document modified
          const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
            productId: source.ref.id,
            productName: freshSale.productName,
            type: 'OUT',
            quantity: -deductAmount,
            fromLocationId: source.data.location,
            reason: `Levantamento Venda #${freshSale.guideNumber}`,
            userId: user.id,
            userName: user.username,
          };
          transaction.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });

          remainingToDeduct -= deductAmount;
        }
      }

      transaction.update(saleRef, { status: 'Levantado' });

      // Side effect post-transaction logic
      // Send notification with total remaining stock
      checkStockAndNotify({ ...loadedProducts[0].data, stock: totalStock - freshSale.quantity });
    });

  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations, user, checkStockAndNotify, toast]);

  const addProduction = useCallback(async (prodData: Omit<Production, 'id' | 'date' | 'registeredBy' | 'status'>) => {
    if (!firestore || !companyId || !user) throw new Error("Contexto não pronto.");

    const { productName, quantity, location, orderId, unit } = prodData;
    const targetLocation = location || (isMultiLocation && locations.length > 0 ? locations[0].id : 'Principal');

    // 1. Move product lookup OUTSIDE the transaction because transactions don't support queries
    const productsRef = collection(firestore, `companies/${companyId}/products`);
    const q = query(productsRef, where("name", "==", productName), where("location", "==", targetLocation));
    const productQuerySnapshot = await getDocs(q);
    const existingProductId = !productQuerySnapshot.empty ? productQuerySnapshot.docs[0].id : null;

    try {
      await runTransaction(firestore, async (transaction) => {
        // --- ALL READS MUST COME FIRST ---

        // 2. Prepare Product Reference and Read
        const productDocRef = existingProductId ? doc(productsRef, existingProductId) : doc(productsRef);
        const pDoc = await transaction.get(productDocRef);

        // 3. Check for Recipe and Read all Raw Materials
        const recipe = recipesData?.find(r => r.productName === productName);
        const ingredientDocs: { ref: DocumentReference, data: RawMaterial, requiredQty: number }[] = [];

        if (recipe) {
          for (const ingredient of recipe.ingredients) {
            const materialRef = doc(firestore, `companies/${companyId}/rawMaterials`, ingredient.rawMaterialId);
            const materialDoc = await transaction.get(materialRef);

            if (!materialDoc.exists()) {
              throw new Error(`Matéria-prima não encontrada (ID: ${ingredient.rawMaterialId}) para a receita de ${productName}.`);
            }

            // Yield-based calculation: if yieldPerUnit is set, use ceil rounding (never half-units)
            // e.g., 1 bag (qty=1) produces 75 products (yieldPerUnit=75)
            // To produce 150: ceil(150/75) * 1 = 2 bags
            // To produce 76:  ceil(76/75) * 1  = 2 bags (rounds up)
            // Backward compatibility: if no yieldPerUnit, use old linear calculation
            const yieldPer = ingredient.yieldPerUnit && ingredient.yieldPerUnit > 0 ? ingredient.yieldPerUnit : null;
            const requiredQty = yieldPer
              ? Math.ceil(quantity / yieldPer) * ingredient.quantity
              : ingredient.quantity * quantity;

            ingredientDocs.push({
              ref: materialRef,
              data: materialDoc.data() as RawMaterial,
              requiredQty: requiredQty
            });
          }
        }

        // --- ALL VALIDATION AND CALCULATIONS ---

        // 4. Validate Raw Material Stock
        for (const ingDoc of ingredientDocs) {
          if ((ingDoc.data.stock || 0) < ingDoc.requiredQty) {
            throw new Error(`Stock insuficiente de ${ingDoc.data.name}. Necessário: ${ingDoc.requiredQty}, Disponível: ${ingDoc.data.stock}.`);
          }
        }

        // --- ALL WRITES MUST COME LAST ---

        // 5. Update Raw Materials
        for (const ingDoc of ingredientDocs) {
          transaction.update(ingDoc.ref, { stock: ingDoc.data.stock - ingDoc.requiredQty });
        }

        // 6. Update/Create Product Stock
        if (pDoc.exists()) {
          const pData = pDoc.data() as Product;
          transaction.update(productDocRef, {
            stock: (pData.stock || 0) + quantity,
            lastUpdated: new Date().toISOString()
          });
        } else {
          const catalogProduct = catalogProductsData?.find(p => p.name === productName);
          const newProductData = {
            name: productName,
            category: catalogProduct?.category || 'Geral',
            stock: quantity,
            reservedStock: 0,
            price: catalogProduct?.price || 0,
            location: targetLocation,
            lastUpdated: new Date().toISOString(),
            unit: unit || catalogProduct?.unit || 'un',
            lowStockThreshold: catalogProduct?.lowStockThreshold || 10,
            criticalStockThreshold: catalogProduct?.criticalStockThreshold || 5,
          };
          transaction.set(productDocRef, newProductData);
        }

        // 7. Create Production Record
        const newProduction: any = {
          date: new Date().toISOString().split('T')[0],
          productName: productName || 'Produto Desconhecido',
          quantity: Number(quantity) || 0,
          unit: unit || 'un',
          registeredBy: user.username || 'Desconhecido',
          status: 'Concluído',
          location: targetLocation || 'Principal',
        };

        // Explicitly include orderId ONLY if it has a valid string value
        if (orderId && typeof orderId === 'string' && orderId.trim() !== '' && orderId !== 'undefined') {
          newProduction.orderId = orderId;
        }

        const productionsRef = collection(firestore, `companies/${companyId}/productions`);
        transaction.set(doc(productionsRef), newProduction);

        // 8. Create Stock Movement Log
        const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);
        const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
          productId: productDocRef.id,
          productName,
          type: 'IN',
          quantity,
          toLocationId: targetLocation,
          reason: `Produção: ${quantity} ${unit || 'un'}`,
          userId: user.id,
          userName: user.username,
        };
        transaction.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });

      }); // End Transaction


      addNotification({
        type: 'production',
        message: `Produção de ${quantity} ${unit || 'un'} de ${productName} registada e stock atualizado.`,
        href: '/production',
      });

    } catch (e: any) {
      console.error("Production error:", e);
      toast({ variant: 'destructive', title: 'Erro na Produção', description: e.message });
      throw e; // Re-throw so the dialog knows to stay open or handle error
    }
  }, [firestore, companyId, user, addNotification, recipesData, productsData, catalogProductsData, isMultiLocation, locations, toast]);

  const addProductionLog = useCallback(async (orderId: string, logData: { quantity: number; notes?: string }) => {
    if (!firestore || !companyId || !user || !ordersData) return;

    const orderToUpdate = ordersData.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    try {
      const orderDocRef = doc(firestore, `companies/${companyId}/orders`, orderId);
      const productionsRef = collection(firestore, `companies/${companyId}/productions`);
      const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

      // Resolve product reference outside transaction (queries not allowed inside)
      let resolvedProductRef: DocumentReference | null = null;
      if (orderToUpdate.productId) {
        const directRef = doc(firestore, `companies/${companyId}/products`, orderToUpdate.productId);
        const directSnap = await getDoc(directRef);
        if (directSnap.exists()) {
          resolvedProductRef = directRef;
        } else {
          // Fallback: productId might be the product name
          const targetLoc = orderToUpdate.location || (isMultiLocation ? locations[0]?.id : 'Principal');
          const pQuery = query(
            collection(firestore, `companies/${companyId}/products`),
            where('name', '==', orderToUpdate.productName),
            where('location', '==', targetLoc),
            limit(1)
          );
          const pSnap = await getDocs(pQuery);
          if (!pSnap.empty) {
            resolvedProductRef = pSnap.docs[0].ref;
          }
        }
      }

      await runTransaction(firestore, async (transaction) => {
        // --- READS ---
        let productData: Product | null = null;
        if (resolvedProductRef) {
          const pDoc = await transaction.get(resolvedProductRef);
          if (pDoc.exists()) {
            productData = pDoc.data() as Product;
          }
        }

        // --- WRITES ---
        const newLog: ProductionLog = {
          id: `log-${Date.now()}`,
          date: new Date().toISOString(),
          quantity: logData.quantity,
          notes: logData.notes,
          registeredBy: user.username || 'Desconhecido',
        };
        const newQuantityProduced = orderToUpdate.quantityProduced + logData.quantity;

        transaction.update(orderDocRef, {
          quantityProduced: newQuantityProduced,
          productionLogs: arrayUnion(newLog)
        });

        const newProduction: Omit<Production, 'id'> = {
          date: new Date().toISOString().split('T')[0],
          productName: orderToUpdate.productName,
          quantity: logData.quantity,
          unit: orderToUpdate.unit,
          location: orderToUpdate.location,
          registeredBy: user.username || 'Desconhecido',
          status: 'Concluído',
          orderId: orderId
        };
        transaction.set(doc(productionsRef), newProduction);

        // Increment physical stock and register stock movement
        if (resolvedProductRef && productData) {
          transaction.update(resolvedProductRef, {
            stock: (productData.stock || 0) + logData.quantity,
            lastUpdated: new Date().toISOString()
          });

          const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
            productId: resolvedProductRef.id,
            productName: orderToUpdate.productName,
            type: 'IN',
            quantity: logData.quantity,
            toLocationId: orderToUpdate.location,
            reason: `Produção Parcial (Encomenda #${orderId.slice(-6).toUpperCase()}): ${logData.quantity} ${orderToUpdate.unit || 'un'}`,
            userId: user.id,
            userName: user.username,
          };
          transaction.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });
        }
      });

      toast({
        title: "Registo de Produção Adicionado",
        description: `${logData.quantity} unidades de "${orderToUpdate.productName}" foram produzidas e adicionadas ao stock.`,
      });
      addNotification({
        type: 'production',
        message: `Produção de ${orderToUpdate.productName} atualizada.`,
        href: `/orders?id=${orderId}`
      });

    } catch (error: any) {
      console.error("Error adding production log: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao Registar",
        description: error.message || "Não foi possível guardar o registo de produção.",
      });
    }
  }, [firestore, companyId, user, ordersData, toast, addNotification, isMultiLocation, locations]);


  const addCatalogProduct = useCallback(async (productData: Omit<CatalogProduct, 'id'>) => {
    if (!catalogProductsCollectionRef) {
      throw new Error("Referência da coleção do catálogo não disponível.");
    }
    try {
      addDocumentNonBlocking(catalogProductsCollectionRef, productData);
    } catch (e) {
      console.error("Error adding catalog product:", e);
      throw new Error("Não foi possível adicionar o produto ao catálogo.");
    }
  }, [catalogProductsCollectionRef]);

  const addCatalogCategory = useCallback(async (categoryName: string) => {
    if (!catalogCategoriesCollectionRef || !catalogCategoriesData) return;
    const trimmedName = categoryName.trim();
    if (!trimmedName) return;

    const exists = catalogCategoriesData.some(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      return;
    }

    try {
      addDocumentNonBlocking(catalogCategoriesCollectionRef, { name: trimmedName });
    } catch (e) {
      console.error("Error adding catalog category:", e);
      throw new Error("Não foi possível adicionar a nova categoria.");
    }
  }, [catalogCategoriesCollectionRef, catalogCategoriesData]);

  const deleteSale = useCallback(async (saleId: string) => {
    if (!firestore || !companyId || !productsCollectionRef || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'A base de dados não está pronta.' });
      return;
    }
    const saleRef = doc(firestore, `companies/${companyId}/sales`, saleId);

    try {
      const saleDoc = await getDoc(saleRef);
      if (!saleDoc.exists()) {
        throw new Error("Venda não encontrada.");
      }
      const saleData = saleDoc.data() as Sale;

      let productDocRef: DocumentReference | null = null;
      if (saleData.status === 'Pago' || saleData.status === 'Levantado') {
        const productQuery = query(
          productsCollectionRef,
          where("name", "==", saleData.productName),
          where("location", "==", saleData.location || (isMultiLocation ? locations[0]?.id : 'Principal'))
        );
        const productSnapshot = await getDocs(productQuery);
        if (!productSnapshot.empty) {
          productDocRef = productSnapshot.docs[0].ref;
        }
      }

      await runTransaction(firestore, async (transaction) => {
        // We reinstate stock because "Deleting" a sale usually means it was valid but we want to cancel it.
        // Soft delete logic: Just mark as deleted? If we mark as deleted but keep stock deducted, it's just hiding.
        // User expects "Undo" usually for accidental deletion.
        // If we want "Undo" to work perfectly, we should NOT revert stock on soft delete if we assume it's just moving to trash,
        // BUT if we don't revert stock, the stock count is wrong if the sale is indeed cancelled.
        // Plan: Soft delete = "Cancelled" effectively. So we revert stock.
        // Restore = "Re-do" sale. We take stock again.

        if (productDocRef) {
          const productDoc = await transaction.get(productDocRef);
          if (productDoc.exists()) {
            const productData = productDoc.data() as Product;
            let stockUpdate = {};

            // If it was just 'Pago' (reserved), we free reserved.
            // If it was 'Levantado' (stock taken), we free stock AND reserved? No, just stock.
            // Wait, logic:
            // Pago -> Reserved Stock increased.
            // Levantado -> Stock decreased (Reserved decreased).

            if (saleData.status === 'Pago') {
              const newReserved = Math.max(0, productData.reservedStock - saleData.quantity);
              stockUpdate = { reservedStock: newReserved };
            } else if (saleData.status === 'Levantado') {
              // Stock was already taken. Put it back.
              const newStock = productData.stock + saleData.quantity;
              stockUpdate = { stock: newStock };
            }

            transaction.update(productDocRef, stockUpdate);
          }
        }

        // Soft delete the sale document
        transaction.update(saleRef, {
          deletedAt: new Date().toISOString(),
          deletedBy: user.username
        });
      });

      toast({ title: 'Venda enviada para Lixeira', description: 'O stock foi reposto.' });

    } catch (error: any) {
      console.error("Error deleting sale: ", error);
      toast({ variant: 'destructive', title: 'Erro ao Apagar Venda', description: error.message });
    }
  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations, toast, user]);

  const recalculateReservedStock = useCallback(async () => {
    if (!firestore || !companyId || !productsData) {
      toast({ variant: 'destructive', title: 'Erro', description: 'A base de dados não está pronta para esta operação.' });
      return;
    }

    toast({ title: 'A recalcular stock reservado...', description: 'Isto pode demorar um momento.' });

    try {
      // 1. Fetch all 'Paid' and 'Pending' sales directly from Firestore
      const salesRef = collection(firestore, `companies/${companyId}/sales`);
      // We use "in" query to get both Paid and Pending
      const q = query(salesRef, where("status", "in", ["Pago", "Pendente"]));
      const salesSnapshot = await getDocs(q);
      const sales = salesSnapshot.docs.map(doc => doc.data() as Sale);

      // 2. Calculate the correct reserved stock for each product instance (name + location)
      const correctReservedMap = new Map<string, number>(); // Key: 'productName|locationId'
      sales.forEach(sale => {
        // Exclude deleted sales
        if (sale.deletedAt) return;

        // Exclude Proformas (usually don't reserve stock)
        if (sale.documentType === 'Factura Proforma') return;

        // Use an empty string for undefined location to ensure consistency
        const locationKey = sale.location || '';
        const key = `${sale.productName}|${locationKey}`;
        const currentReserved = correctReservedMap.get(key) || 0;
        correctReservedMap.set(key, currentReserved + sale.quantity);
      });

      // 3. Compare with existing data and prepare batch update
      const batch = writeBatch(firestore);
      let updatesCount = 0;

      productsData.forEach(product => {
        const locationKey = product.location || '';
        const key = `${product.name}|${locationKey}`;
        const correctReserved = correctReservedMap.get(key) || 0;

        if (product.reservedStock !== correctReserved) {
          const productRef = doc(firestore, `companies/${companyId}/products`, product.id);
          batch.update(productRef, { reservedStock: correctReserved });
          updatesCount++;
        }
      });

      // 4. Commit batch if needed
      if (updatesCount > 0) {
        await batch.commit();
        toast({ title: 'Sucesso!', description: `${updatesCount} registo(s) de stock reservado foram corrigidos.` });
      } else {
        toast({ title: 'Tudo certo!', description: 'Nenhuma inconsistência encontrada no stock reservado.' });
      }

    } catch (error: any) {
      console.error("Error recalculating reserved stock:", error);
      toast({ variant: 'destructive', title: 'Erro ao Recalcular', description: 'Não foi possível completar a operação.' });
    }
  }, [firestore, companyId, productsData, toast]);

  const deleteProduction = useCallback((productionId: string) => {
    if (!productionsCollectionRef) return;
    const docRef = doc(productionsCollectionRef, productionId);
    updateDocumentNonBlocking(docRef, { deletedAt: new Date().toISOString() });
    toast({ title: 'Registo de Produção movido para Lixeira' });
  }, [productionsCollectionRef, toast]);

  const updateProduction = useCallback((productionId: string, data: Partial<Production>) => {
    if (!productionsCollectionRef) return;
    const docRef = doc(productionsCollectionRef, productionId);
    updateDocumentNonBlocking(docRef, data);
    toast({ title: 'Registo de Produção Atualizado' });
  }, [productionsCollectionRef, toast]);

  const deleteOrder = useCallback(async (orderId: string) => {
    if (!ordersCollectionRef || !firestore || !companyId) return;

    try {
      const orderRef = doc(ordersCollectionRef, orderId);
      const orderSnap = await getDoc(orderRef);

      if (orderSnap.exists()) {
        const orderData = orderSnap.data() as Order;

        // Find the associated sale to soft-delete it too
        const salesRef = collection(firestore, `companies/${companyId}/sales`);
        const saleQuery = query(salesRef, where('orderId', '==', orderId), limit(1));
        const saleSnap = await getDocs(saleQuery);
        const associatedSaleRef = !saleSnap.empty ? saleSnap.docs[0].ref : null;

        // If order is pending or in production, we need to release the Reserved Stock
        if ((orderData.status === 'Pendente' || orderData.status === 'Em produção') && orderData.productId) {
          // Resolve product reference with fallback
          let resolvedProductRef: DocumentReference | null = null;
          const directRef = doc(firestore, `companies/${companyId}/products`, orderData.productId);
          const directSnap = await getDoc(directRef);
          if (directSnap.exists()) {
            resolvedProductRef = directRef;
          } else {
            // Fallback: productId might be the product name
            const targetLoc = orderData.location || 'Principal';
            const pQuery = query(
              collection(firestore, `companies/${companyId}/products`),
              where('name', '==', orderData.productName),
              where('location', '==', targetLoc),
              limit(1)
            );
            const pSnap = await getDocs(pQuery);
            if (!pSnap.empty) {
              resolvedProductRef = pSnap.docs[0].ref;
            }
          }

          await runTransaction(firestore, async (transaction) => {
            if (resolvedProductRef) {
              const pDoc = await transaction.get(resolvedProductRef);
              if (pDoc.exists()) {
                const pData = pDoc.data() as Product;
                const currentReserved = pData.reservedStock || 0;
                const quantityToRelease = orderData.quantity;
                const newReserved = Math.max(0, currentReserved - quantityToRelease);

                transaction.update(resolvedProductRef, {
                  reservedStock: newReserved,
                  lastUpdated: new Date().toISOString()
                });
              }
            }
            // Soft delete the order
            transaction.update(orderRef, { deletedAt: new Date().toISOString() });
            // Also soft delete the associated sale
            if (associatedSaleRef) {
              transaction.update(associatedSaleRef, { deletedAt: new Date().toISOString(), deletedBy: user?.username || 'Sistema' });
            }
          });
        } else {
          // Standard soft delete for completed/delivered orders (stock was already handled)
          updateDocumentNonBlocking(orderRef, { deletedAt: new Date().toISOString() });
          if (associatedSaleRef) {
            updateDocumentNonBlocking(associatedSaleRef, { deletedAt: new Date().toISOString(), deletedBy: user?.username || 'Sistema' });
          }
        }
        toast({ title: 'Encomenda movida para Lixeira', description: 'A venda associada também foi removida.' });
      }
    } catch (e: any) {
      console.error("Error deleting order:", e);
      toast({ variant: 'destructive', title: 'Erro ao Apagar', description: e.message });
    }
  }, [ordersCollectionRef, firestore, companyId, toast, user]);

  const finalizeOrder = useCallback(async (orderId: string, finalPayment: number) => {
    if (!firestore || !companyId || !user) return;

    try {
      // 1. Get Sale ID (outside transaction query)
      const salesRef = collection(firestore, `companies/${companyId}/sales`);
      const q = query(salesRef, where("orderId", "==", orderId));
      const salesSnap = await getDocs(q);
      const saleDoc = salesSnap.docs[0];

      await runTransaction(firestore, async (transaction) => {
        // --- READS ---

        // 1. Get Order
        const orderRef = doc(firestore, `companies/${companyId}/orders`, orderId);
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Encomenda não encontrada.");
        const orderData = orderSnap.data() as Order;

        // 2. Get Sale (if exists)
        let freshSaleData: Sale | null = null;
        let saleRef: DocumentReference | null = null;
        if (saleDoc) {
          saleRef = doc(firestore, `companies/${companyId}/sales`, saleDoc.id);
          const freshSaleSnap = await transaction.get(saleRef);
          if (freshSaleSnap.exists()) {
            freshSaleData = freshSaleSnap.data() as Sale;
          }
        }

        // 3. Get Product (if exists)
        let freshProductData: Product | null = null;
        let productRef: DocumentReference | null = null;
        if (orderData.productId) {
          productRef = doc(firestore, `companies/${companyId}/products`, orderData.productId);
          const productSnap = await transaction.get(productRef);
          if (productSnap.exists()) {
            freshProductData = productSnap.data() as Product;
          }
        }

        // --- WRITES ---

        // 4. Update Sale
        if (saleRef && freshSaleData) {
          const newAmountPaid = (freshSaleData.amountPaid || 0) + finalPayment;
          transaction.update(saleRef, {
            amountPaid: newAmountPaid,
            status: 'Levantado',
            paymentStatus: newAmountPaid >= freshSaleData.totalValue ? 'Pago' : 'Parcial'
          });
        }

        // 5. Update Order Status
        transaction.update(orderRef, { status: 'Entregue' });

        // 6. Create Production Record & Stock Movements
        if (productRef && freshProductData) {
          const locationToUse = orderData.location || (isMultiLocation ? locations[0]?.id : 'Principal');
          const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

          // Only create production record and IN movement if order was NOT already completed
          // (confirmAutoProduction or addProductionLog already handled stock IN)
          const alreadyProduced = orderData.status === 'Concluída';

          if (!alreadyProduced) {
            // 6a. Add to 'productions'
            const productionsRef = collection(firestore, `companies/${companyId}/productions`);
            const newProduction = {
              date: new Date().toISOString().split('T')[0],
              productName: orderData.productName || 'Produto Desconhecido',
              quantity: Number(orderData.quantity) || 0,
              unit: orderData.unit || 'un',
              registeredBy: user.username || 'Sistema',
              status: 'Concluído',
              location: locationToUse,
              orderId: orderId
            };
            transaction.set(doc(productionsRef), newProduction);

            // 6b-IN. Register Stock Movement IN (Production)
            const movementIn = {
              productId: productRef.id,
              productName: orderData.productName,
              type: 'IN',
              quantity: orderData.quantity,
              toLocationId: locationToUse,
              reason: `Produção (Encomenda #${orderId.slice(-6).toUpperCase()}): ${orderData.quantity} ${orderData.unit || 'un'}`,
              userId: user.id,
              userName: user.username,
              timestamp: serverTimestamp()
            };
            transaction.set(doc(movementsRef), movementIn);
          }

          // 6b-OUT. Always register the delivery OUT movement
          const movementOut = {
            productId: productRef.id,
            productName: orderData.productName,
            type: 'OUT',
            quantity: orderData.quantity,
            fromLocationId: locationToUse,
            reason: `Venda (Levantamento Encomenda #${orderId.slice(-6).toUpperCase()}): ${orderData.quantity} ${orderData.unit || 'un'}`,
            userId: user.id,
            userName: user.username,
            saleId: saleRef ? saleRef.id : undefined,
            timestamp: serverTimestamp()
          };
          transaction.set(doc(movementsRef), movementOut);

          // 6c. Update stock and deduct reservation
          // If already produced: stock already has the units, just deduct stock + reserved
          // If not produced: +stock (production) -stock (delivery) = net 0 change to stock, just deduct reserved
          let newReserved = (freshProductData.reservedStock || 0) - orderData.quantity;
          if (newReserved < 0) newReserved = 0;

          if (alreadyProduced) {
            // Stock was already added by confirmAutoProduction/addProductionLog, now deduct for delivery
            const newStock = (freshProductData.stock || 0) - orderData.quantity;
            transaction.update(productRef, {
              stock: Math.max(0, newStock),
              reservedStock: newReserved,
              lastUpdated: new Date().toISOString()
            });
          } else {
            // Net stock change is 0 (+prod -delivery), just clear reservation
            transaction.update(productRef, {
              reservedStock: newReserved,
              lastUpdated: new Date().toISOString()
            });
          }
        }
      });

      toast({ title: 'Encomenda Finalizada', description: 'A produção foi registada e o stock atualizado.' });

    } catch (e: any) {
      console.error("Error finalizing order:", e);
      toast({ variant: 'destructive', title: 'Erro ao Finalizar', description: e.message });
    }
  }, [firestore, companyId, user, toast, isMultiLocation, locations]);

  const addRawMaterial = useCallback(async (material: Omit<RawMaterial, 'id'>) => {
    if (!rawMaterialsCollectionRef) return;
    addDocumentNonBlocking(rawMaterialsCollectionRef, material);
    toast({ title: 'Matéria-Prima Adicionada' });
  }, [rawMaterialsCollectionRef, toast]);

  const updateRawMaterial = useCallback(async (materialId: string, data: Partial<RawMaterial>) => {
    if (!rawMaterialsCollectionRef) return;
    const docRef = doc(rawMaterialsCollectionRef as CollectionReference, materialId);
    updateDocumentNonBlocking(docRef, data);
    toast({ title: 'Matéria-Prima Atualizada' });
  }, [rawMaterialsCollectionRef, toast]);

  const deleteRawMaterial = useCallback(async (materialId: string) => {
    if (!rawMaterialsCollectionRef) return;
    deleteDocumentNonBlocking(doc(rawMaterialsCollectionRef as CollectionReference, materialId));
    toast({ title: 'Matéria-Prima Removida' });
  }, [rawMaterialsCollectionRef, toast]);

  const addRecipe = useCallback(async (recipe: Omit<Recipe, 'id'>) => {
    if (!recipesCollectionRef) return;
    addDocumentNonBlocking(recipesCollectionRef, recipe);
    toast({ title: 'Receita Adicionada' });
  }, [recipesCollectionRef, toast]);

  const updateRecipe = useCallback(async (recipeId: string, data: Partial<Recipe>) => {
    if (!recipesCollectionRef) return;
    const docRef = doc(recipesCollectionRef as CollectionReference, recipeId);
    updateDocumentNonBlocking(docRef, data);
    toast({ title: 'Receita Atualizada' });
  }, [recipesCollectionRef, toast]);

  /*
  const deleteRecipe = useCallback(async (recipeId: string) => {
    if (!recipesCollectionRef) return;
    deleteDocumentNonBlocking(doc(recipesCollectionRef as CollectionReference, recipeId));
    toast({ title: 'Receita Removida' });
  }, [recipesCollectionRef, toast]);
  */



  const restoreItem = useCallback(async (collectionName: string, id: string) => {
    if (!firestore || !companyId) return;
    const docRef = doc(firestore, `companies/${companyId}/${collectionName}`, id);

    // If it's a sale, we might need to deduct stock again?
    // For simplicity in this iteration, we just restore the record. 
    // Ideally, if we restored stock on delete, we should consume it on restore.
    // This logic is complex for "Undo".
    // Let's implement basic restore (remove deletedAt) first.

    await updateDocumentNonBlocking(docRef, { deletedAt: null, deletedBy: null });
    toast({ title: 'Item Restaurado' });
  }, [firestore, companyId, toast]);

  const hardDelete = useCallback(async (collectionName: string, id: string) => {
    if (!firestore || !companyId) return;
    try {
      const docRef = doc(firestore, `companies/${companyId}/${collectionName}`, id);
      await deleteDoc(docRef); // Force standard delete to ensure it waits and updates
      toast({ title: 'Item Apagado Permanentemente' });
    } catch (error: any) {
      console.error("Hard delete error:", error);
      toast({ variant: 'destructive', title: 'Erro ao Apagar', description: error.message });
    }
  }, [firestore, companyId, toast]);

  const exportCompanyData = useCallback(async () => {
    if (!productsData || !salesData) {
      toast({ variant: 'destructive', title: 'Aguarde', description: 'Os dados ainda estão a carregar.' });
      return;
    }

    const backup = {
      date: new Date().toISOString(),
      company: companyData,
      products: products,
      sales: salesData,
      clients: [], // Assuming separate clients collection later, for now implicit in sales
      version: '1.0'
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `majorstockx-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }, [productsData, salesData, companyData, products, toast]);

  // --- Units & Categories Management ---
  const availableUnits = useMemo(() => {
    const defaultUnits = ['un', 'kg', 'm', 'm²', 'm³', 'L', 'cxs', 'saco', 'rolo', 'cj', 'ton', 'lata', 'galão'];
    const companyUnits = companyData?.validUnits || [];
    // Also include units currently in use by products to prevent data loss or hiding
    const productUnits = productsData?.map(p => p.unit).filter(Boolean) as string[] || [];
    const materialUnits = rawMaterialsData?.map(m => m.unit).filter(Boolean) as string[] || [];

    // Merge unique
    const allUnits = Array.from(new Set([...defaultUnits, ...companyUnits, ...productUnits, ...materialUnits]));
    return allUnits.sort((a, b) => a.localeCompare(b));
  }, [companyData, productsData, rawMaterialsData]);

  const addUnit = useCallback(async (unit: string) => {
    if (!firestore || !companyId) return;
    try {
      const companyRef = doc(firestore, 'companies', companyId);
      await updateDoc(companyRef, {
        validUnits: arrayUnion(unit)
      });
      toast({ title: 'Unidade Adicionada', description: `A unidade "${unit}" foi adicionada.` });
    } catch (error) {
      console.error("Error adding unit:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao adicionar unidade." });
    }
  }, [firestore, companyId, toast]);

  const editUnit = useCallback(async (oldUnit: string, newUnit: string) => {
    if (!firestore || !companyId || !oldUnit || !newUnit) return;
    try {
      const batch = writeBatch(firestore);

      const currentValidUnits = companyData?.validUnits || [];
      const updatedValidUnits = Array.from(new Set(currentValidUnits.filter(u => u !== oldUnit).concat(newUnit)));
      const companyRef = doc(firestore, 'companies', companyId);
      batch.update(companyRef, { validUnits: updatedValidUnits });

      const productsToUpdate = productsData?.filter(p => p.unit === oldUnit) || [];
      productsToUpdate.forEach(p => {
        if (p.id) {
          const docRef = doc(firestore, `companies/${companyId}/products`, p.id);
          batch.update(docRef, { unit: newUnit, lastUpdated: new Date().toISOString() });
        }
      });

      const rawMaterialsToUpdate = rawMaterialsData?.filter(r => r.unit === oldUnit) || [];
      rawMaterialsToUpdate.forEach(r => {
        if (r.id) {
          const docRef = doc(firestore, `companies/${companyId}/rawMaterials`, r.id);
          batch.update(docRef, { unit: newUnit });
        }
      });

      await batch.commit();
      toast({ title: 'Unidade Editada', description: `A unidade "${oldUnit}" passou a "${newUnit}".` });
    } catch (error) {
      console.error("Error editing unit:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao editar a unidade." });
    }
  }, [firestore, companyId, toast, companyData, productsData, rawMaterialsData]);

  const removeUnit = useCallback(async (unit: string) => {
    if (!firestore || !companyId || !unit) return;
    try {
      const companyRef = doc(firestore, 'companies', companyId);
      await updateDoc(companyRef, {
        validUnits: arrayRemove(unit)
      });
      toast({ title: 'Unidade Removida', description: `A unidade "${unit}" foi removida da lista.` });
    } catch (error) {
      console.error("Error removing unit:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao remover unidade." });
    }
  }, [firestore, companyId, toast]);

  const availableCategories = useMemo(() => {
    const catalogCats = catalogCategoriesData?.map(c => c.name) || [];
    const companyCats = companyData?.validCategories || [];
    const productCats = productsData?.map(p => p.category).filter(Boolean) as string[] || [];

    const allCats = Array.from(new Set([...catalogCats, ...companyCats, ...productCats]));
    return allCats.sort((a, b) => a.localeCompare(b));
  }, [catalogCategoriesData, companyData, productsData]);

  const addCategory = useCallback(async (category: string) => {
    if (!firestore || !companyId) return;
    try {
      // We update company-specific categories to keep it clean
      const companyRef = doc(firestore, 'companies', companyId);
      await updateDoc(companyRef, {
        validCategories: arrayUnion(category)
      });
      toast({ title: 'Categoria Adicionada', description: `Categoria "${category}" adicionada.` });
    } catch (error) {
      console.error("Error adding category:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao adicionar categoria." });
    }
  }, [firestore, companyId, toast]);

  const editCategory = useCallback(async (oldCategory: string, newCategory: string) => {
    if (!firestore || !companyId || !oldCategory || !newCategory) return;
    try {
      const batch = writeBatch(firestore);

      const currentValidCategories = companyData?.validCategories || [];
      const updatedValidCategories = Array.from(new Set(currentValidCategories.filter(c => c !== oldCategory).concat(newCategory)));
      const companyRef = doc(firestore, 'companies', companyId);
      batch.update(companyRef, { validCategories: updatedValidCategories });

      // Clean up catalogCategories: Drop old one, create new one if it doesn't exist
      const oldCatalogCat = catalogCategoriesData?.find(c => c.name.toLowerCase() === oldCategory.toLowerCase());
      if (oldCatalogCat && oldCatalogCat.id) {
        const docRef = doc(firestore, `companies/${companyId}/catalogCategories`, oldCatalogCat.id);
        batch.delete(docRef);
      }

      const newCatalogCatExists = catalogCategoriesData?.some(c => c.name.toLowerCase() === newCategory.toLowerCase());
      if (!newCatalogCatExists) {
        const newCatRef = doc(collection(firestore, `companies/${companyId}/catalogCategories`));
        batch.set(newCatRef, { name: newCategory });
      }

      const catalogProductsToUpdate = catalogProductsData?.filter(p => p.category === oldCategory) || [];
      catalogProductsToUpdate.forEach(p => {
        if (p.id) {
          const docRef = doc(firestore, `companies/${companyId}/catalogProducts`, p.id);
          batch.update(docRef, { category: newCategory });
        }
      });

      const productsToUpdate = productsData?.filter(p => p.category === oldCategory) || [];
      productsToUpdate.forEach(p => {
        if (p.id) {
          const docRef = doc(firestore, `companies/${companyId}/products`, p.id);
          batch.update(docRef, { category: newCategory, lastUpdated: new Date().toISOString() });
        }
      });

      await batch.commit();
      toast({ title: 'Categorias Fundidas', description: `A categoria "${oldCategory}" foi unificada com "${newCategory}".` });
    } catch (error) {
      console.error("Error editing category:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao editar a categoria." });
    }
  }, [firestore, companyId, toast, companyData, productsData, catalogProductsData, catalogCategoriesData]);

  const removeCategory = useCallback(async (category: string) => {
    if (!firestore || !companyId || !category) return;
    try {
      const companyRef = doc(firestore, 'companies', companyId);
      await updateDoc(companyRef, {
        validCategories: arrayRemove(category)
      });
      toast({ title: 'Categoria Removida', description: `Categoria "${category}" removida.` });
    } catch (error) {
      console.error("Error removing category:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao remover categoria." });
    }
  }, [firestore, companyId, toast]);

  // Products Merge Tool
  const mergeProducts = useCallback(async (targetProductId: string, sourceProductIds: string[]) => {
    if (!productsCollectionRef || !firestore || !companyId) return;

    try {
      const batch = writeBatch(firestore);
      if (!productsData) return;
      const targetProduct = productsData.find(p => p.id === targetProductId);

      if (!targetProduct) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Produto principal não encontrado.' });
        return;
      }

      let totalStockToAdd = 0;
      let totalReservedToAdd = 0;
      const sourceIdsRecord: string[] = targetProduct.sourceIds || [];

      // Calculate totals and mark sources for deletion
      for (const sourceId of sourceProductIds) {
        const sourceProduct = productsData?.find(p => p.id === sourceId);
        if (sourceProduct) {
          totalStockToAdd += (sourceProduct.stock || 0);
          totalReservedToAdd += (sourceProduct.reservedStock || 0);
          sourceIdsRecord.push(sourceId);

          // Delete source product
          const sourceRef = doc(productsCollectionRef as CollectionReference, sourceId);
          batch.delete(sourceRef);
        }
      }

      // Update target product
      const targetRef = doc(productsCollectionRef as CollectionReference, targetProductId);
      batch.update(targetRef, {
        stock: (targetProduct.stock || 0) + totalStockToAdd,
        reservedStock: (targetProduct.reservedStock || 0) + totalReservedToAdd,
        sourceIds: sourceIdsRecord,
        lastUpdated: new Date().toISOString()
      });

      await batch.commit();
      toast({
        title: 'Produtos Unificados!',
        description: `${sourceProductIds.length} produtos foram fundidos em "${targetProduct.name}".`
      });

    } catch (error) {
      console.error("Error merging products:", error);
      toast({ variant: 'destructive', title: 'Erro ao Unificar', description: 'Ocorreu um erro ao tentar unificar os produtos.' });
    }
  }, [productsCollectionRef, firestore, companyId, productsData, toast]);

  const isDataLoading = loading || productsLoading || salesLoading || productionsLoading || ordersLoading || stockMovementsLoading || catalogProductsLoading || catalogCategoriesLoading || rawMaterialsLoading || recipesLoading;

  // 30-Day Retention Policy Cleanup
  useEffect(() => {
    if (!companyId || !firestore || !user || user.role !== 'Admin') return;

    const cleanupOldDeletedItems = async () => {
      const retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
      const now = new Date().getTime();

      // Check Products
      if (productsData) {
        productsData.forEach(p => {
          if (p.deletedAt) {
            const deletedDate = new Date(p.deletedAt).getTime();
            if (now - deletedDate > retentionPeriod) {
              console.log(`Auto-deleting old product: ${p.name}`);
              hardDelete('products', p.id!);
            }
          }
        });
      }

      // Check Sales
      if (salesData) {
        salesData.forEach(s => {
          if (s.deletedAt) {
            const deletedDate = new Date(s.deletedAt).getTime();
            if (now - deletedDate > retentionPeriod) {
              console.log(`Auto-deleting old sale: ${s.guideNumber}`);
              hardDelete('sales', s.id);
            }
          }
        });
      }
    };

    // Run cleanup with a small delay to ensure data is loaded
    const timer = setTimeout(cleanupOldDeletedItems, 5000);
    return () => clearTimeout(timer);
  }, [companyId, firestore, user, productsData, salesData, hardDelete]);

  // Auto-Sync Smart Thresholds Background
  useEffect(() => {
    if (!companyId || !firestore || !productsData || !stockMovementsData) return;

    const tryAutoSync = () => {
      syncSmartThresholds();
    };

    // Run slightly after mount to not block UI rendering
    const timer = setTimeout(tryAutoSync, 8000);
    return () => clearTimeout(timer);
  }, [companyId, firestore, productsData, stockMovementsData, syncSmartThresholds]);

  // Real-time Event-Driven Prediction Recalculation (Após Vendas)
  useEffect(() => {
    if (!lastSaleTimestamp || lastSaleTimestamp === 0) return;

    // Wait 5 seconds to ensure Firebase snapshot is complete, then force a sync (true)
    const timer = setTimeout(() => {
      syncSmartThresholds(true);
      console.log("Triggered Smart Threshold Sync after POS sale.");
    }, 5000);

    return () => clearTimeout(timer);
  }, [lastSaleTimestamp, syncSmartThresholds]);

  // confirmAction implementation
  const [confirmationAction, setConfirmationAction] = useState<(() => Promise<void>) | null>(null);
  const [confirmationTitle, setConfirmationTitle] = useState<string>("Confirmação");
  const [confirmationMessage, setConfirmationMessage] = useState<string>("");

  const confirmAction = useCallback((action: () => Promise<void>, title: string = "Confirmação", message: string = "Tem a certeza?") => {
    setConfirmationAction(() => action);
    setConfirmationTitle(title);
    setConfirmationMessage(message);
  }, []);

  const handleConfirm = async () => {
    if (confirmationAction) {
      await confirmationAction();
      setConfirmationAction(null);
    }
  };

  const value: InventoryContextType = useMemo(() => ({
    user,
    firebaseUser,
    companyId,
    loading: isDataLoading,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    changePassword,
    registerCompany,
    registerCompanyWithGoogle,
    profilePicture, setProfilePicture: handleSetProfilePicture,
    canView, canEdit,
    companyData,
    products: products,
    allProducts: productsData || [],
    sales: (salesData || []).filter(s => !s.deletedAt),
    allSales: salesData || [],
    productions: (productionsData || []).filter(p => !p.deletedAt),
    allProductions: productionsData || [],
    orders: (ordersData || []).filter(o => !o.deletedAt),
    allOrders: ordersData || [],
    stockMovements: stockMovementsData || [],
    catalogProducts: catalogProductsData || [],
    catalogCategories: catalogCategoriesData || [],
    rawMaterials: rawMaterialsData || [],
    recipes: recipesData || [],
    locations, isMultiLocation, notifications, monthlySalesChartData, dashboardStats,
    businessStartDate,
    chatHistory, setChatHistory,
    addProduct, updateProduct, deleteProduct,
    auditStock, transferStock, updateProductStock, updateCompany, addSale, addBulkSale, confirmSalePickup, addProductionLog,
    addProduction, updateProduction, deleteProduction, deleteOrder, finalizeOrder, deleteSale,
    clearProductsCollection,
    mergeProducts,
    restoreItem,
    hardDelete,
    exportCompanyData,
    syncSmartThresholds,

    markNotificationAsRead, markAllAsRead, clearNotifications, addNotification,
    recalculateReservedStock,
    addCatalogProduct, addCatalogCategory,
    addRawMaterial,
    updateRawMaterial,
    deleteRawMaterial,
    addRecipe,
    updateRecipe,
    // deleteRecipe,
    categorizeProductWithAI,

    availableUnits, addUnit, editUnit, removeUnit,
    availableCategories, addCategory, editCategory, removeCategory,

    confirmAction,
  }), [
    user, firebaseUser, companyId, isDataLoading,
    login, loginWithGoogle, logout, resetPassword, registerCompany, registerCompanyWithGoogle, profilePicture, handleSetProfilePicture,
    canView, canEdit,
    companyData, productsData, salesData, productionsData, ordersData, stockMovementsData, catalogProductsData, catalogCategoriesData,
    rawMaterialsData, recipesData,
    locations, isMultiLocation, notifications, monthlySalesChartData, dashboardStats,
    businessStartDate,
    chatHistory, setChatHistory,
    addProduct, updateProduct, deleteProduct,
    auditStock, transferStock, updateProductStock, updateCompany, addSale, addBulkSale, confirmSalePickup, addProductionLog,
    addProduction, updateProduction, deleteProduction, deleteOrder, finalizeOrder, deleteSale,
    clearProductsCollection,
    markNotificationAsRead, markAllAsRead, clearNotifications, addNotification,
    recalculateReservedStock,
    addCatalogProduct, addCatalogCategory,
    addRawMaterial,
    updateRawMaterial,
    addRecipe,
    updateRecipe,
    mergeProducts,
    restoreItem,
    exportCompanyData,
    availableUnits, addUnit,
    availableCategories, addCategory,
    syncSmartThresholds,
    confirmAction,
  ]);

  return (
    <InventoryContext.Provider value={value}>
      {children}
      <PasswordConfirmationDialog
        open={!!confirmationAction}
        onOpenChange={(open) => !open && setConfirmationAction(null)}
        onConfirm={handleConfirm}
        title={confirmationTitle}
        description={confirmationMessage}
      />
    </InventoryContext.Provider>
  );
}

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
