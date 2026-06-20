// Core data models for Pollo Centro Inventory System

export type UserRole = 'admin' | 'manager' | 'operations';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  createdAt: Date;
}

export interface Location {
  id: string;
  name: string;
  address?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  phone?: string;
  active: boolean;
}

export interface ScheduleShift {
  id: string;
  employeeId: string;
  employeeName: string;
  locationId: string;
  locationName: string;
  dayOfWeek: number; // 0 = Lunes, 6 = Domingo
  startTime: string; // 'HH:mm'
  endTime: string;   // 'HH:mm'
  weekKey: string;   // e.g., '2026-W23'
}

// Los locales ahora provienen del backend (GET /api/locations).
// La interfaz Location se mantiene como contrato de datos.

export type ProductCategory = string;
export type ProductUnit = 'kg' | 'lb' | 'unidad' | 'litro' | 'paquete';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  currentStock: number;
  unit: ProductUnit;
  minStock: number;
  currentPrice: number;
  lastUpdated: Date;
  createdBy: string;
  supplierId?: string;
  supplierName?: string;
}

export interface RecipeIngredient {
  productId: string;
  productName?: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  estimatedCost: number;   // costo de producción (calculado de los ingredientes)
  salePrice: number;       // precio de venta al consumidor
  preparedStock?: number;  // unidades ya preparadas disponibles en inventario
  createdAt: Date;
  createdBy: string;
}

export interface RecipeLog {
  id: string;
  recipeId: string;
  recipeName: string;
  preparedBy: string;
  preparedAt: Date;
  ingredientsUsed: { productId: string; productName: string; quantity: number }[];
  totalCost: number;
  quantity: number;
}

export interface PriceRecord {
  id: string;
  productId: string;
  productName?: string;
  price: number;
  supplier?: string;
  recordedAt: Date;
  recordedBy: string;
}

export interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  unit: ProductUnit;
  status: 'active' | 'resolved';
  whatsappSent: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: Date;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  active: boolean;
  notes?: string;
}

export interface OrderReception {
  id: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  receivedAt: Date;
  receivedBy: string;
  status: 'pending' | 'completed' | 'cancelled';
}

// ===== Envíos a locales =====
export type DispatchItemType = 'ingrediente' | 'receta';

export interface DispatchItem {
  type: DispatchItemType;
  refId: string;       // productId o recipeId
  name: string;
  quantity: number;
  unit?: string;
}

export interface Dispatch {
  id: string;
  locationId: string;
  locationName: string;
  items: DispatchItem[];
  dispatchedById?: string;   // uid del usuario que registró el envío
  dispatchedBy: string;      // nombre del usuario
  note?: string;
  createdAt: Date;
}

// ===== Contabilidad (módulo estilo QuickBooks, solo admin) =====
export type AccountType = 'Activo' | 'Pasivo' | 'Capital' | 'Ingreso' | 'Gasto';
export type TransactionType = 'ingreso' | 'gasto';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  description?: string;
  active: boolean;
}

export interface Transaction {
  id: string;
  date: Date | string;
  type: TransactionType;
  localId?: string;
  localName?: string;
  accountId: string;
  accountName: string;
  accountType?: string;
  amount: number;
  description?: string;
  paymentMethod?: string;
  reference?: string;
  contact?: string;
  recordedBy?: string;
}

export interface CategoryAmount {
  account: string;
  amount: number;
}

export interface MonthlyPoint {
  period: string;
  label: string;
  income: number;
  expense: number;
}

export interface AccountingSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  transactionCount: number;
  incomeByAccount: CategoryAmount[];
  expenseByAccount: CategoryAmount[];
  monthly: MonthlyPoint[];
}

export const ACCOUNT_TYPES: AccountType[] = ['Activo', 'Pasivo', 'Capital', 'Ingreso', 'Gasto'];
export const PAYMENT_METHODS = ['efectivo', 'tarjeta', 'transferencia', 'cheque'];

// Permission matrix
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'dashboard.view',
    'inventory.view', 'inventory.edit', 'inventory.create', 'inventory.delete',
    'recipes.view', 'recipes.create', 'recipes.prepare', 'recipes.delete',
    'prices.view', 'prices.edit',
    'reports.view',
    'schedule.view', 'schedule.edit',
    'alerts.view', 'alerts.configure',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'audit.view',
    'suppliers.view', 'suppliers.edit', 'suppliers.create', 'suppliers.delete',
    'orders.view', 'orders.create', 'orders.edit',
    'accounting.view', 'accounting.edit',
    'dispatch.view', 'dispatch.create',
  ],
  // Manager: gestión general SIN horarios ni recetas.
  manager: [
    'dashboard.view',
    'inventory.view', 'inventory.edit', 'inventory.create',
    'prices.view', 'prices.edit',
    'reports.view',
    'alerts.view', 'alerts.configure',
    'audit.view',
    'suppliers.view', 'suppliers.create',
    'orders.view', 'orders.create',
    'dispatch.view', 'dispatch.create',
  ],
  // Operations: inventario + preparar recetas (sin crear/editar) + envíos a locales.
  operations: [
    'inventory.view', 'inventory.create', 'inventory.edit',
    'recipes.view', 'recipes.prepare',
    'dispatch.view', 'dispatch.create',
  ],
};

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  pollo: '🍗 Pollo',
  insumos: '🧂 Insumos',
  empaque: '📦 Empaque',
  limpieza: '🧹 Limpieza',
  otro: '📋 Otro',
};

export const UNIT_LABELS: Record<ProductUnit, string> = {
  kg: 'Kilogramos',
  lb: 'Libras',
  unidad: 'Unidades',
  litro: 'Litros',
  paquete: 'Paquetes',
};
