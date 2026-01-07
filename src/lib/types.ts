export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'Admin' | 'Funcionário';
  status: 'Ativo' | 'Pendente';
  permissions: {
    canSell: boolean;
    canRegisterProduction: boolean;
    canEditInventory: boolean;
    canTransferStock: boolean;
    canViewReports: boolean;
  };
};

export type Product = {
  id: string;
  name: string;
  category: string;
  stock: number;
  lowStockThreshold: number;
  criticalStockThreshold: number;
  lastUpdated: string;
};

export type Sale = {
  id: string;
  date: string;
  productName: string;
  quantity: number;
  soldBy: string;
  guideNumber: string;
};

export type Production = {
  id: string;
  date: string;
  productName: string;
  quantity: number;
  registeredBy: string;
};

export type Notification = {
  id: string;
  message: string;
  date: string;
  read: boolean;
};

export type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
};
