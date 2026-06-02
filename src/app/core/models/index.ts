// Core data models for Pollo Centro Inventory System

export type UserRole = 'master' | 'manager' | 'operations';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  createdAt: Date;
}

export type ProductCategory = 'pollo' | 'insumos' | 'empaque' | 'limpieza' | 'otro';
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
  estimatedCost: number;
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

// Permission matrix
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  master: [
    'dashboard.view',
    'inventory.view', 'inventory.edit', 'inventory.create', 'inventory.delete',
    'recipes.view', 'recipes.create', 'recipes.prepare', 'recipes.delete',
    'prices.view', 'prices.edit',
    'reports.view',
    'alerts.view', 'alerts.configure',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'audit.view',
  ],
  manager: [
    'dashboard.view',
    'inventory.view', 'inventory.edit', 'inventory.create',
    'recipes.view', 'recipes.create', 'recipes.prepare',
    'prices.view', 'prices.edit',
    'reports.view',
    'alerts.view', 'alerts.configure',
    'audit.view',
  ],
  operations: [
    'dashboard.view',
    'inventory.view',
    'recipes.view', 'recipes.prepare',
    'prices.view',
    'reports.view',
    'alerts.view',
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
