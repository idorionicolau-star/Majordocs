
export type PermissionLevel = 'none' | 'read' | 'write';

export type ModulePermission = 
  | 'dashboard'
  | 'inventory'
  | 'sales'
  | 'production'
  | 'orders'
  | 'reports'
  | 'users'
  | 'settings';

// This is the User Map object for quick lookups.
export type UserMap = {
  companyId: string;
}

export type Employee = {
  id:string;
  username: string;
  email: string; // This is the full login email
  password?: string; // Should be handled securely, never stored in plain text
  role: 'Admin' | 'Employee' | 'Dono';
  companyId: string;
  permissions: Partial<Record<ModulePermission, PermissionLevel>>;
};

export type Company = {
    id: string;
    name: string;
    ownerId?: string; // Optional: To track the original creator
    phone?: string;
    address?: string;
    taxId?: string;
    email?: string;
    isMultiLocation?: boolean;
    locations?: Location[];
};

export type Location = {
  id: string;
  name: string;
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
  location?: string;
  status: 'Pendente' | 'Em produção' | 'Concluída';
  productionStartDate?: string | null;
  quantityProduced: number;
  productionLogs: ProductionLog[];
};

export type MovementType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';

export interface StockMovement {
  id?: string;
  productId: string;
  productName: string; // Denormalized name for easier log reading
  type: MovementType;
  quantity: number; // e.g., +10 for IN, -5 for OUT
  fromLocationId?: string; // Used in TRANSFER and OUT
  toLocationId?: string;   // Used in TRANSFER and IN
  reason: string;          // e.g., "Venda #102", "Auditoria", "Dano", "Transferência"
  userId: string;          // Who performed the action
  userName: string;        // Denormalized name for quick log reading
  timestamp: any;          // Firestore serverTimestamp
  
  // For Audits
  isAudit?: boolean;
  systemCountBefore?: number; // What the system thought it had before adjustment
  physicalCount?: number;     // What the user actually counted
}

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

export type InitialCatalog = {
  [category: string]: {
    [subType: string]: string[];
  };
};
