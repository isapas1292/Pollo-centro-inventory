import { Injectable, signal, computed } from '@angular/core';
import { Product, Recipe, RecipeLog, PriceRecord, StockAlert, AppUser, AuditLog } from '../models';

/**
 * DataService — Simulates a real-time database using localStorage + signals.
 * Architecture ready to swap with Firebase Firestore when credentials are configured.
 * All data is reactive via Angular Signals.
 */
@Injectable({ providedIn: 'root' })
export class DataService {

  // --- Reactive stores ---
  private _products = signal<Product[]>([]);
  private _recipes = signal<Recipe[]>([]);
  private _recipeLogs = signal<RecipeLog[]>([]);
  private _priceHistory = signal<PriceRecord[]>([]);
  private _alerts = signal<StockAlert[]>([]);
  private _users = signal<AppUser[]>([]);
  private _auditLogs = signal<AuditLog[]>([]);

  // --- Public readonly signals ---
  readonly products = this._products.asReadonly();
  readonly recipes = this._recipes.asReadonly();
  readonly recipeLogs = this._recipeLogs.asReadonly();
  readonly priceHistory = this._priceHistory.asReadonly();
  readonly alerts = this._alerts.asReadonly();
  readonly users = this._users.asReadonly();
  readonly auditLogs = this._auditLogs.asReadonly();

  // --- Computed signals ---
  readonly activeAlerts = computed(() => this._alerts().filter(a => a.status === 'active'));
  readonly totalProducts = computed(() => this._products().length);
  readonly lowStockProducts = computed(() =>
    this._products().filter(p => p.currentStock <= p.minStock)
  );

  constructor() {
    this.loadAll();
    this.seedDemoDataIfEmpty();
  }

  // ==========================================
  // PRODUCTS
  // ==========================================
  addProduct(product: Omit<Product, 'id' | 'lastUpdated'>): Product {
    const newProduct: Product = {
      ...product,
      id: this.generateId(),
      lastUpdated: new Date(),
    };
    this._products.update(list => [...list, newProduct]);
    this.persist('pc_products', this._products());

    // Record initial price
    this.addPriceRecord({
      productId: newProduct.id,
      productName: newProduct.name,
      price: newProduct.currentPrice,
      recordedBy: product.createdBy,
    });

    this.checkStockAlert(newProduct);
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>): void {
    this._products.update(list =>
      list.map(p => p.id === id ? { ...p, ...updates, lastUpdated: new Date() } : p)
    );
    this.persist('pc_products', this._products());

    const product = this._products().find(p => p.id === id);
    if (product) {
      if (updates.currentPrice !== undefined) {
        this.addPriceRecord({
          productId: id,
          productName: product.name,
          price: updates.currentPrice,
          recordedBy: 'system',
        });
      }
      this.checkStockAlert(product);
    }
  }

  deleteProduct(id: string): void {
    this._products.update(list => list.filter(p => p.id !== id));
    this.persist('pc_products', this._products());
  }

  getProduct(id: string): Product | undefined {
    return this._products().find(p => p.id === id);
  }

  // ==========================================
  // RECIPES
  // ==========================================
  addRecipe(recipe: Omit<Recipe, 'id' | 'createdAt'>): Recipe {
    const newRecipe: Recipe = {
      ...recipe,
      id: this.generateId(),
      createdAt: new Date(),
    };
    this._recipes.update(list => [...list, newRecipe]);
    this.persist('pc_recipes', this._recipes());
    return newRecipe;
  }

  updateRecipe(id: string, updates: Partial<Recipe>): void {
    this._recipes.update(list =>
      list.map(r => r.id === id ? { ...r, ...updates } : r)
    );
    this.persist('pc_recipes', this._recipes());
  }

  deleteRecipe(id: string): void {
    this._recipes.update(list => list.filter(r => r.id !== id));
    this.persist('pc_recipes', this._recipes());
  }

  /**
   * Prepare a recipe: validates stock, deducts inventory, logs the preparation.
   * Returns null if stock is insufficient.
   */
  prepareRecipe(recipeId: string, preparedBy: string, quantity: number = 1): RecipeLog | null {
    const recipe = this._recipes().find(r => r.id === recipeId);
    if (!recipe) return null;

    // Validate stock
    for (const ingredient of recipe.ingredients) {
      const product = this._products().find(p => p.id === ingredient.productId);
      if (!product || product.currentStock < ingredient.quantity * quantity) {
        return null; // Insufficient stock
      }
    }

    // Deduct stock
    const ingredientsUsed: RecipeLog['ingredientsUsed'] = [];
    let totalCost = 0;

    for (const ingredient of recipe.ingredients) {
      const product = this._products().find(p => p.id === ingredient.productId)!;
      const qtyUsed = ingredient.quantity * quantity;
      const cost = qtyUsed * product.currentPrice;

      ingredientsUsed.push({
        productId: product.id,
        productName: product.name,
        quantity: qtyUsed,
      });
      totalCost += cost;

      this.updateProduct(product.id, {
        currentStock: product.currentStock - qtyUsed,
      });
    }

    // Create log
    const log: RecipeLog = {
      id: this.generateId(),
      recipeId,
      recipeName: recipe.name,
      preparedBy,
      preparedAt: new Date(),
      ingredientsUsed,
      totalCost,
      quantity,
    };

    this._recipeLogs.update(list => [log, ...list]);
    this.persist('pc_recipe_logs', this._recipeLogs());

    return log;
  }

  canPrepareRecipe(recipeId: string, quantity: number = 1): { canPrepare: boolean; missing: string[] } {
    const recipe = this._recipes().find(r => r.id === recipeId);
    if (!recipe) return { canPrepare: false, missing: ['Receta no encontrada'] };

    const missing: string[] = [];
    for (const ingredient of recipe.ingredients) {
      const product = this._products().find(p => p.id === ingredient.productId);
      if (!product) {
        missing.push(`${ingredient.productName || ingredient.productId} (no existe)`);
      } else if (product.currentStock < ingredient.quantity * quantity) {
        missing.push(`${product.name}: necesita ${ingredient.quantity * quantity} ${product.unit}, tiene ${product.currentStock}`);
      }
    }

    return { canPrepare: missing.length === 0, missing };
  }

  // ==========================================
  // PRICE HISTORY
  // ==========================================
  addPriceRecord(record: Omit<PriceRecord, 'id' | 'recordedAt'>): void {
    const newRecord: PriceRecord = {
      ...record,
      id: this.generateId(),
      recordedAt: new Date(),
    };
    this._priceHistory.update(list => [newRecord, ...list]);
    this.persist('pc_price_history', this._priceHistory());
  }

  getPriceHistory(productId: string): PriceRecord[] {
    return this._priceHistory().filter(p => p.productId === productId);
  }

  // ==========================================
  // ALERTS
  // ==========================================
  private checkStockAlert(product: Product): void {
    const existing = this._alerts().find(
      a => a.productId === product.id && a.status === 'active'
    );

    if (product.currentStock <= product.minStock) {
      if (!existing) {
        const alert: StockAlert = {
          id: this.generateId(),
          productId: product.id,
          productName: product.name,
          currentStock: product.currentStock,
          minStock: product.minStock,
          unit: product.unit,
          status: 'active',
          whatsappSent: false,
          createdAt: new Date(),
        };
        this._alerts.update(list => [alert, ...list]);
        this.persist('pc_alerts', this._alerts());
      } else {
        // Update current stock in alert
        this._alerts.update(list =>
          list.map(a => a.id === existing.id ? { ...a, currentStock: product.currentStock } : a)
        );
        this.persist('pc_alerts', this._alerts());
      }
    } else if (existing) {
      // Resolve alert
      this._alerts.update(list =>
        list.map(a => a.id === existing.id
          ? { ...a, status: 'resolved' as const, resolvedAt: new Date() }
          : a
        )
      );
      this.persist('pc_alerts', this._alerts());
    }
  }

  resolveAlert(id: string): void {
    this._alerts.update(list =>
      list.map(a => a.id === id
        ? { ...a, status: 'resolved' as const, resolvedAt: new Date() }
        : a
      )
    );
    this.persist('pc_alerts', this._alerts());
  }

  markAlertWhatsappSent(id: string): void {
    this._alerts.update(list =>
      list.map(a => a.id === id ? { ...a, whatsappSent: true } : a)
    );
    this.persist('pc_alerts', this._alerts());
  }

  // ==========================================
  // USERS
  // ==========================================
  addUser(user: Omit<AppUser, 'uid' | 'createdAt'>, password: string): AppUser {
    const newUser: AppUser = {
      ...user,
      uid: this.generateId(),
      createdAt: new Date(),
    };
    this._users.update(list => [...list, newUser]);
    this.persist('pc_users', this._users());

    // Store password
    const passwords = JSON.parse(localStorage.getItem('pc_passwords') || '{}');
    passwords[newUser.uid] = password;
    localStorage.setItem('pc_passwords', JSON.stringify(passwords));

    return newUser;
  }

  updateUser(uid: string, updates: Partial<AppUser>): void {
    this._users.update(list =>
      list.map(u => u.uid === uid ? { ...u, ...updates } : u)
    );
    this.persist('pc_users', this._users());
  }

  deleteUser(uid: string): void {
    this._users.update(list => list.filter(u => u.uid !== uid));
    this.persist('pc_users', this._users());
  }

  // ==========================================
  // AUDIT
  // ==========================================
  addAuditLog(userId: string, userName: string, action: string, details: string): void {
    const log: AuditLog = {
      id: this.generateId(),
      userId,
      userName,
      action,
      details,
      timestamp: new Date(),
    };
    this._auditLogs.update(list => [log, ...list]);
    this.persist('pc_audit_logs', this._auditLogs());
  }

  // ==========================================
  // PERSISTENCE
  // ==========================================
  private loadAll(): void {
    this._products.set(this.load('pc_products'));
    this._recipes.set(this.load('pc_recipes'));
    this._recipeLogs.set(this.load('pc_recipe_logs'));
    this._priceHistory.set(this.load('pc_price_history'));
    this._alerts.set(this.load('pc_alerts'));
    this._users.set(this.load('pc_users'));
    this._auditLogs.set(this.load('pc_audit_logs'));
  }

  private load<T>(key: string): T[] {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  private persist<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  // ==========================================
  // DEMO DATA
  // ==========================================
  private seedDemoDataIfEmpty(): void {
    if (this._products().length > 0) return;

    const demoProducts: Omit<Product, 'id' | 'lastUpdated'>[] = [
      { name: 'Pollo Entero', category: 'pollo', currentStock: 150, unit: 'unidad', minStock: 30, currentPrice: 4.50, createdBy: 'system' },
      { name: 'Pechuga de Pollo', category: 'pollo', currentStock: 80, unit: 'kg', minStock: 20, currentPrice: 6.20, createdBy: 'system' },
      { name: 'Muslos de Pollo', category: 'pollo', currentStock: 12, unit: 'kg', minStock: 15, currentPrice: 3.80, createdBy: 'system' },
      { name: 'Alas de Pollo', category: 'pollo', currentStock: 45, unit: 'kg', minStock: 10, currentPrice: 3.50, createdBy: 'system' },
      { name: 'Aceite Vegetal', category: 'insumos', currentStock: 25, unit: 'litro', minStock: 10, currentPrice: 2.80, createdBy: 'system' },
      { name: 'Sal', category: 'insumos', currentStock: 8, unit: 'kg', minStock: 5, currentPrice: 0.50, createdBy: 'system' },
      { name: 'Pimienta', category: 'insumos', currentStock: 3, unit: 'kg', minStock: 2, currentPrice: 8.00, createdBy: 'system' },
      { name: 'Harina de Trigo', category: 'insumos', currentStock: 30, unit: 'kg', minStock: 10, currentPrice: 1.20, createdBy: 'system' },
      { name: 'Cajas Delivery', category: 'empaque', currentStock: 200, unit: 'unidad', minStock: 50, currentPrice: 0.35, createdBy: 'system' },
      { name: 'Bolsas Plásticas', category: 'empaque', currentStock: 5, unit: 'paquete', minStock: 10, currentPrice: 3.00, createdBy: 'system' },
      { name: 'Desinfectante', category: 'limpieza', currentStock: 6, unit: 'litro', minStock: 3, currentPrice: 4.50, createdBy: 'system' },
      { name: 'Guantes Descartables', category: 'limpieza', currentStock: 4, unit: 'paquete', minStock: 5, currentPrice: 5.00, createdBy: 'system' },
    ];

    const products = demoProducts.map(p => this.addProduct(p));

    // Seed price history (simulate last 30 days)
    const now = new Date();
    for (const product of products) {
      for (let i = 30; i >= 1; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const variation = 1 + (Math.random() - 0.48) * 0.08; // slight upward bias
        const historicalPrice = +(product.currentPrice * variation).toFixed(2);
        const record: PriceRecord = {
          id: this.generateId(),
          productId: product.id,
          productName: product.name,
          price: historicalPrice,
          recordedAt: date,
          recordedBy: 'system',
        };
        this._priceHistory.update(list => [...list, record]);
      }
    }
    this.persist('pc_price_history', this._priceHistory());

    // Seed recipes
    const chickenIds = products.filter(p => p.category === 'pollo').map(p => p.id);
    const demoRecipes: Omit<Recipe, 'id' | 'createdAt'>[] = [
      {
        name: 'Pollo Frito Clásico',
        description: 'Pollo empanizado y frito, la especialidad de la casa',
        ingredients: [
          { productId: products[0].id, productName: 'Pollo Entero', quantity: 2 },
          { productId: products[4].id, productName: 'Aceite Vegetal', quantity: 3 },
          { productId: products[7].id, productName: 'Harina de Trigo', quantity: 0.5 },
          { productId: products[5].id, productName: 'Sal', quantity: 0.1 },
          { productId: products[6].id, productName: 'Pimienta', quantity: 0.05 },
        ],
        estimatedCost: 0,
        createdBy: 'system',
      },
      {
        name: 'Pechuga a la Plancha',
        description: 'Pechuga de pollo a la plancha con especias',
        ingredients: [
          { productId: products[1].id, productName: 'Pechuga de Pollo', quantity: 1 },
          { productId: products[4].id, productName: 'Aceite Vegetal', quantity: 0.2 },
          { productId: products[5].id, productName: 'Sal', quantity: 0.05 },
          { productId: products[6].id, productName: 'Pimienta', quantity: 0.02 },
        ],
        estimatedCost: 0,
        createdBy: 'system',
      },
      {
        name: 'Alitas BBQ',
        description: 'Alitas de pollo con salsa BBQ',
        ingredients: [
          { productId: products[3].id, productName: 'Alas de Pollo', quantity: 2 },
          { productId: products[4].id, productName: 'Aceite Vegetal', quantity: 0.5 },
          { productId: products[5].id, productName: 'Sal', quantity: 0.05 },
        ],
        estimatedCost: 0,
        createdBy: 'system',
      },
    ];

    for (const recipe of demoRecipes) {
      // Calculate estimated cost
      let cost = 0;
      for (const ing of recipe.ingredients) {
        const prod = products.find(p => p.id === ing.productId);
        if (prod) cost += prod.currentPrice * ing.quantity;
      }
      recipe.estimatedCost = +cost.toFixed(2);
      this.addRecipe(recipe);
    }
  }
}
