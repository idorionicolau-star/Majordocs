
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
  instanceId: string;
  id: string;
  name: string;
  category: string;
  stock: number;
  reservedStock: number;
  price: number;
  lowStockThreshold: number;
  criticalStockThreshold: number;
  lastUpdated: string;
  location?: string;
};

export type Sale = {
  id: string;
  date: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  soldBy: string;
  guideNumber: string;
  location?: string;
  status: 'Pago' | 'Levantado';
};

export type Production = {
  id: string;
  date: string;
  productName: string;
  quantity: number;
  registeredBy: string;
  location?: string;
};

export type ProductionLog = {
  id: string;
  date: string;
  quantity: number;
  notes?: string;
  registeredBy: string;
};

export type Order = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: 'un' | 'm²' | 'm' | 'cj' | 'outro';
  clientName?: string;
  deliveryDate: string;
  status: 'Pendente' | 'Em produção' | 'Concluída';
  productionStartDate?: string | null;
  quantityProduced: number;
  productionLogs: ProductionLog[];
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

export type Location = {
  id: string;
  name: string;
};

    