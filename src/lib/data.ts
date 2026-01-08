
import type { User, Product, Sale, Production, Notification, NavItem, Order } from './types';
import {
  LayoutDashboard,
  Box,
  ShoppingCart,
  Hammer,
  Settings,
  ClipboardList,
  BarChart3,
} from 'lucide-react';

export const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Inventário', href: '/inventory', icon: Box },
  { title: 'Vendas', href: '/sales', icon: ShoppingCart },
  { title: 'Produção', href: '/production', icon: Hammer },
  { title: 'Encomendas', href: '/orders', icon: ClipboardList },
  { title: 'Relatórios', href: '/reports', icon: BarChart3 },
  { title: 'Ajustes', href: '/settings', icon: Settings },
];

export const users: User[] = [
  {
    id: 'USR001',
    name: 'Admin Geral',
    email: 'admin@majorstockx.com',
    avatar: 'https://picsum.photos/seed/1/40/40',
    role: 'Admin',
    status: 'Ativo',
    permissions: {
      canSell: true,
      canRegisterProduction: true,
      canEditInventory: true,
      canTransferStock: true,
      canViewReports: true,
    },
  },
  {
    id: 'USR002',
    name: 'João Silva',
    email: 'joao.silva@majorstockx.com',
    avatar: 'https://picsum.photos/seed/2/40/40',
    role: 'Funcionário',
    status: 'Ativo',
    permissions: {
      canSell: true,
      canRegisterProduction: false,
      canEditInventory: false,
      canTransferStock: false,
      canViewReports: false,
    },
  },
  {
    id: 'USR003',
    name: 'Maria Santos',
    email: 'maria.santos@majorstockx.com',
    avatar: 'https://picsum.photos/seed/3/40/40',
    role: 'Funcionário',
    status: 'Pendente',
    permissions: {
      canSell: false,
      canRegisterProduction: true,
      canEditInventory: true,
      canTransferStock: false,
      canViewReports: false,
    },
  },
];

export const products: Product[] = [
  { id: 'PROD001', instanceId: 'inst_001', name: 'Grelha 30x30 Floriada', category: 'Grelhas', stock: 150, reservedStock: 20, price: 120.50, lowStockThreshold: 50, criticalStockThreshold: 20, lastUpdated: '2024-05-20' },
  { id: 'PROD002', instanceId: 'inst_002', name: 'Pavê 6cm Cinza', category: 'Pavê', stock: 2500, reservedStock: 0, price: 15.00, lowStockThreshold: 1000, criticalStockThreshold: 500, lastUpdated: '2024-05-21' },
  { id: 'PROD003', instanceId: 'inst_003', name: 'Lancis de Concreto 1m', category: 'Lancis', stock: 45, reservedStock: 10, price: 250.00, lowStockThreshold: 30, criticalStockThreshold: 10, lastUpdated: '2024-05-22' },
  { id: 'PROD004', instanceId: 'inst_004', name: 'Tanque Duplo 2m', category: 'Tanques', stock: 12, reservedStock: 0, price: 3500.00, lowStockThreshold: 10, criticalStockThreshold: 5, lastUpdated: '2024-05-19' },
  { id: 'PROD005', instanceId: 'inst_005', name: 'Tampa de Concreto 60x60', category: 'Tampas', stock: 80, reservedStock: 0, price: 450.00, lowStockThreshold: 40, criticalStockThreshold: 15, lastUpdated: '2024-05-21' },
  { id: 'PROD006', instanceId: 'inst_006', name: 'Parede 3D Modelo Onda', category: 'Parede Rústica e 3D', stock: 300, reservedStock: 0, price: 85.00, lowStockThreshold: 100, criticalStockThreshold: 50, lastUpdated: '2024-05-22' },
];


export const sales: Sale[] = [
  { id: 'SALE001', date: '2024-05-22T10:30:00Z', productId: 'PROD001', productName: 'Grelha 30x30 Floriada', quantity: 20, unitPrice: 120.50, totalValue: 2410.00, soldBy: 'João Silva', guideNumber: 'GT20240522-001', status: 'Pago' },
  { id: 'SALE002', date: '2024-05-22T14:15:00Z', productId: 'PROD002', productName: 'Pavê 6cm Cinza', quantity: 500, unitPrice: 15.00, totalValue: 7500.00, soldBy: 'João Silva', guideNumber: 'GT20240522-002', status: 'Levantado' },
  { id: 'SALE003', date: '2024-05-21T11:00:00Z', productId: 'PROD003', productName: 'Lancis de Concreto 1m', quantity: 10, unitPrice: 250.00, totalValue: 2500.00, soldBy: 'João Silva', guideNumber: 'GT20240521-001', status: 'Pago' },
];

export const productions: Production[] = [
  { id: 'PRODREC001', date: '2024-05-22', productName: 'Grelha 30x30 Floriada', quantity: 100, registeredBy: 'Maria Santos' },
  { id: 'PRODREC002', date: '2024-05-21', productName: 'Pavê 6cm Cinza', quantity: 1000, registeredBy: 'Maria Santos' },
];

export const orders: Order[] = [
    { 
        id: 'ORD001', 
        productId: 'PROD001', 
        productName: 'Grelha 30x30 Floriada', 
        quantity: 200, 
        unit: 'un', 
        clientName: 'Construtora ABC', 
        deliveryDate: '2024-06-10', 
        status: 'Pendente',
        productionStartDate: null,
        quantityProduced: 0,
        productionLogs: [],
    },
    { 
        id: 'ORD002', 
        productId: 'PROD002', 
        productName: 'Pavê 6cm Cinza', 
        quantity: 500, 
        unit: 'm²', 
        clientName: 'Município da Matola', 
        deliveryDate: '2024-06-15', 
        status: 'Em produção',
        productionStartDate: '2024-05-25',
        quantityProduced: 150,
        productionLogs: [
            { id: 'log1', date: '2024-05-25', quantity: 100, registeredBy: 'Maria Santos', notes: 'Início da produção.'},
            { id: 'log2', date: '2024-05-26', quantity: 50, registeredBy: 'Maria Santos', notes: 'Produção em bom ritmo.'},
        ],
    },
    { 
        id: 'ORD003', 
        productId: 'PROD004', 
        productName: 'Tanque Duplo 2m', 
        quantity: 5, 
        unit: 'un', 
        deliveryDate: '2024-06-05', 
        status: 'Concluída',
        productionStartDate: '2024-05-20',
        quantityProduced: 5,
        productionLogs: [
            { id: 'log3', date: '2024-05-20', quantity: 5, registeredBy: 'Maria Santos', notes: 'Produção finalizada em um dia.'}
        ],
    },
];

export const notifications: Notification[] = [
  { id: 'NOTIF001', message: 'Estoque de Lancis de Concreto 1m está baixo.', date: '2024-05-22', read: false },
  { id: 'NOTIF002', message: 'Nova venda #SALE002 registrada por João Silva.', date: '2024-05-22', read: false },
  { id: 'NOTIF003', message: 'Produção de 1000 unidades de Pavê 6cm Cinza concluída.', date: '2024-05-21', read: true },
];

export const currentUser: User = users[0]; // Mock current user as Admin

    