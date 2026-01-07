import type { User, Product, Sale, Production, Notification, NavItem } from './types';
import {
  LayoutDashboard,
  Box,
  ShoppingCart,
  Hammer,
  Users,
  Settings,
} from 'lucide-react';

export const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Inventário', href: '/inventory', icon: Box },
  { title: 'Vendas', href: '/sales', icon: ShoppingCart },
  { title: 'Produção', href: '/production', icon: Hammer },
  { title: 'Usuários', href: '/users', icon: Users },
  { title: 'Configurações', href: '/settings', icon: Settings },
];

export const users: User[] = [
  {
    id: 'USR001',
    name: 'Admin Geral',
    email: 'admin@majorstockx.com',
    avatar: '/avatars/01.png',
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
    avatar: '/avatars/02.png',
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
    avatar: '/avatars/03.png',
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
  { id: 'PROD001', name: 'Grelha 30x30 Floriada', category: 'Grelhas', stock: 150, lowStockThreshold: 50, criticalStockThreshold: 20, lastUpdated: '2024-05-20' },
  { id: 'PROD002', name: 'Pavê 6cm Cinza', category: 'Pavê', stock: 2500, lowStockThreshold: 1000, criticalStockThreshold: 500, lastUpdated: '2024-05-21' },
  { id: 'PROD003', name: 'Lancis de Concreto 1m', category: 'Lancis', stock: 45, lowStockThreshold: 30, criticalStockThreshold: 10, lastUpdated: '2024-05-22' },
  { id: 'PROD004', name: 'Tanque Duplo 2m', category: 'Tanques', stock: 12, lowStockThreshold: 10, criticalStockThreshold: 5, lastUpdated: '2024-05-19' },
  { id: 'PROD005', name: 'Tampa de Concreto 60x60', category: 'Tampas', stock: 80, lowStockThreshold: 40, criticalStockThreshold: 15, lastUpdated: '2024-05-21' },
  { id: 'PROD006', name: 'Parede 3D Modelo Onda', category: 'Parede Rústica e 3D', stock: 300, lowStockThreshold: 100, criticalStockThreshold: 50, lastUpdated: '2024-05-22' },
];

export const sales: Sale[] = [
  { id: 'SALE001', date: '2024-05-22', productName: 'Grelha 30x30 Floriada', quantity: 20, soldBy: 'João Silva', guideNumber: 'GT20240522-001' },
  { id: 'SALE002', date: '2024-05-22', productName: 'Pavê 6cm Cinza', quantity: 500, soldBy: 'João Silva', guideNumber: 'GT20240522-002' },
  { id: 'SALE003', date: '2024-05-21', productName: 'Lancis de Concreto 1m', quantity: 10, soldBy: 'João Silva', guideNumber: 'GT20240521-001' },
];

export const productions: Production[] = [
  { id: 'PRODREC001', date: '2024-05-22', productName: 'Grelha 30x30 Floriada', quantity: 100, registeredBy: 'Maria Santos' },
  { id: 'PRODREC002', date: '2024-05-21', productName: 'Pavê 6cm Cinza', quantity: 1000, registeredBy: 'Maria Santos' },
];

export const notifications: Notification[] = [
  { id: 'NOTIF001', message: 'Estoque de Lancis de Concreto 1m está baixo.', date: '2024-05-22', read: false },
  { id: 'NOTIF002', message: 'Nova venda #SALE002 registrada por João Silva.', date: '2024-05-22', read: false },
  { id: 'NOTIF003', message: 'Produção de 1000 unidades de Pavê 6cm Cinza concluída.', date: '2024-05-21', read: true },
];

export const currentUser: User = users[0]; // Mock current user as Admin
