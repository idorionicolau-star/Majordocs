

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
  profilePictureUrl?: string; // URL for the profile picture
};

export type NotificationSettings = {
  email: string;
  onSale: boolean;
  onCriticalStock: boolean;
};

export type Company = {
    id: string;
    name: string;
    ownerId?: string; // Optional: To track the original creator
    phone?: string;
    address?: string;
    taxId?: string;
    email?: string;
    businessType: 'manufacturer' | 'reseller';
    notificationSettings?: NotificationSettings;
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
  unit?: 'un' | 'm²' | 'm' | 'cj' | 'outro';
};

export type Sale = {
  id: string;
  date: string;
  productId: string;
  productName: string;
  quantity: number;
  unit?: 'un' | 'm²' | 'm' | 'cj' | 'outro';
  unitPrice: number;
  subtotal: number;
  discount?: number;
  vat?: number;
  totalValue: number;
  soldBy: string;
  guideNumber: string;
  location?: string;
  status: 'Pago' | 'Levantado';
  documentType: 'Guia de Remessa' | 'Factura' | 'Factura Proforma' | 'Recibo';
  clientName?: string;
  notes?: string;
};

export type Production = {
  id: string;
  date: string;
  productName: string;
  quantity: number;
  unit?: 'un' | 'm²' | 'm' | 'cj' | 'outro';
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
  deliveryDate?: string;
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

export type AppNotification = {
  id: string;
  message: string;
  date: string;
  read: boolean;
  type: 'stock' | 'sale' | 'production' | 'order';
  href?: string;
};

export type NavItem = {
  title: string;
  href: string;
  id: ModulePermission | string; // Allow string for sub-routes like history
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  adminOnly?: boolean;
  isSubItem?: boolean;
};

export type InitialCatalog = {
  [category: string]: {
    [subType: string]: string[];
  };
};

export type DashboardStats = {
  monthlySalesValue: number;
  averageTicket: number;
  totalInventoryValue: number;
  totalItemsInStock: number;
};

export interface ModelInfo {
  name: string;
  displayName: string;
  description: string;
  version: string;
}

export interface InventoryContextType {
  // Auth related
  user: Employee | null;
  firebaseUser: any | null;
  companyId: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  registerCompany: (companyName: string, adminUsername: string, adminEmail: string, adminPass: string, businessType: 'manufacturer' | 'reseller') => Promise<boolean>;
  profilePicture: string | null;
  setProfilePicture: (url: string) => void;

  // Permission helpers
  canView: (module: ModulePermission) => boolean;
  canEdit: (module: ModulePermission) => boolean;

  // Data related
  products: Product[];
  sales: Sale[];
  productions: Production[];
  orders: Order[];
  catalogProducts: CatalogProduct[];
  catalogCategories: CatalogCategory[];
  locations: Location[];
  isMultiLocation: boolean;
  companyData: Company | null;
  notifications: AppNotification[];
  monthlySalesChartData: { name: string; vendas: number }[];
  dashboardStats: {
    monthlySalesValue: number;
    averageTicket: number;
    totalInventoryValue: number;
    totalItemsInStock: number;
  };


  // Functions
  addProduct: (
    newProductData: Omit<
      Product,
      'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'
    >
  ) => void;
  updateProduct: (instanceId: string, updatedData: Partial<Product>) => void;
  deleteProduct: (instanceId: string) => void;
  clearProductsCollection: () => Promise<void>;
  auditStock: (product: Product, physicalCount: number, reason: string) => void;
  transferStock: (
    productName: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number
  ) => void;
  updateProductStock: (
    productName: string,
    quantity: number,
    locationId?: string
  ) => void;
  updateCompany: (details: Partial<Company>) => Promise<void>;
  addSale: (newSaleData: Omit<Sale, 'id' | 'guideNumber'>) => Promise<void>;
  confirmSalePickup: (sale: Sale) => void;
  deleteSale: (saleId: string) => void;
  addProductionLog: (orderId: string, logData: { quantity: number; notes?: string; }) => void;
  deleteProduction: (productionId: string) => void;
  deleteOrder: (orderId: string) => void;
  clearSales: () => Promise<void>;
  clearProductions: () => Promise<void>;
  clearOrders: () => Promise<void>;
  clearStockMovements: () => Promise<void>;
  markNotificationAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'date' | 'read'>) => void;
  addCatalogProduct: (productData: Omit<CatalogProduct, 'id'>) => Promise<void>;
  addCatalogCategory: (categoryName: string) => Promise<void>;
}

type CatalogProduct = Omit<
  Product,
  'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'
>;
