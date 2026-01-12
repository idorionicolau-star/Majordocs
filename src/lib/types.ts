



export type ModulePermission = 
  | 'dashboard'
  | 'inventory'
  | 'sales'
  | 'production'
  | 'orders'
  | 'reports'
  | 'users'
  | 'settings'
  | 'companies';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Employee';
  companyId: string; // Links user to a company
};

export type Employee = {
  id: string;
  username: string;
  password?: string; // Should be handled securely, never stored in plain text
  role: 'Admin' | 'Employee';
  companyId: string;
  permissions: ModulePermission[];
  token?: { // Placeholder for custom claims from a JWT
      companyId: string;
      role: 'Admin' | 'Employee';
  }
};

export type Company = {
    id: string;
    name: string;
    ownerId?: string; // Optional: To track the original creator
    phone?: string;
    address?: string;
    taxId?: string;
    email?: string;
};

export type Product = {
  id?: string; // Document ID from Firestore
  instanceId: string; // Temporary UI-only ID for React keys
  name: string;
  category: string;
  stock: number;
  reservedStock: number;
  price: number;
  lowStockThreshold: number;
  criticalStockThreshold: number;
  lastUpdated: string;
  location?: string;
  subType?: string;
  unit?: string;
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
  status: 'Concluído' | 'Transferido';
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
  productId: string; // This can be the name or a catalog ID
  productName: string;
  quantity: number;
  unit: 'un' | 'm²' | 'm' | 'cj' | 'outro';
  clientName?: string;
  deliveryDate: string;
  status: 'Pendente' | 'Em produção' | 'Concluída';
  productionStartDate?: string | null;
  quantityProduced: number;
  productionLogs: ProductionLog[];
  location?: string; // Location for the finished product
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
  id: ModulePermission;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  adminOnly?: boolean;
};

export type Location = {
  id: string;
  name: string;
};

export type InitialCatalog = {
  [category: string]: {
    [subType: string]: string[];
  };
};
