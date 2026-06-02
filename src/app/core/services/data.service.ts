import { Injectable, signal, computed } from '@angular/core';
import { Product, Recipe, RecipeLog, PriceRecord, StockAlert, AppUser, AuditLog, Employee, ScheduleShift, LOCATIONS, Supplier, OrderReception } from '../models';

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
  private _employees = signal<Employee[]>([]);
  private _schedules = signal<ScheduleShift[]>([]);

  private _suppliers = signal<Supplier[]>([]);
  private _orderReceptions = signal<OrderReception[]>([]);

  // --- Public readonly signals ---
  readonly products = this._products.asReadonly();
  readonly recipes = this._recipes.asReadonly();
  readonly recipeLogs = this._recipeLogs.asReadonly();
  readonly priceHistory = this._priceHistory.asReadonly();
  readonly alerts = this._alerts.asReadonly();
  readonly users = this._users.asReadonly();
  readonly auditLogs = this._auditLogs.asReadonly();
  readonly employees = this._employees.asReadonly();
  readonly schedules = this._schedules.asReadonly();
  readonly suppliers = this._suppliers.asReadonly();
  readonly orderReceptions = this._orderReceptions.asReadonly();
  readonly locations = LOCATIONS;

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
  // EMPLOYEES & SCHEDULES
  // ==========================================
  addEmployee(employee: Omit<Employee, 'id'>): Employee {
    const newEmp = { ...employee, id: this.generateId() };
    this._employees.update(list => [...list, newEmp]);
    this.persist('pc_employees', this._employees());
    return newEmp;
  }

  updateEmployee(id: string, updates: Partial<Employee>): void {
    this._employees.update(list => list.map(e => e.id === id ? { ...e, ...updates } : e));
    this.persist('pc_employees', this._employees());
  }

  deleteEmployee(id: string): void {
    this._employees.update(list => list.filter(e => e.id !== id));
    this.persist('pc_employees', this._employees());
    // Also delete their schedules
    this._schedules.update(list => list.filter(s => s.employeeId !== id));
    this.persist('pc_schedules', this._schedules());
  }

  addShift(shift: Omit<ScheduleShift, 'id'>): ScheduleShift {
    const newShift = { ...shift, id: this.generateId() };
    this._schedules.update(list => [...list, newShift]);
    this.persist('pc_schedules', this._schedules());
    return newShift;
  }

  updateShift(id: string, updates: Partial<ScheduleShift>): void {
    this._schedules.update(list => list.map(s => s.id === id ? { ...s, ...updates } : s));
    this.persist('pc_schedules', this._schedules());
  }

  deleteShift(id: string): void {
    this._schedules.update(list => list.filter(s => s.id !== id));
    this.persist('pc_schedules', this._schedules());
  }

  getShiftsForWeek(weekKey: string): ScheduleShift[] {
    return this._schedules().filter(s => s.weekKey === weekKey);
  }

  // Helper to generate the current week key
  getCurrentWeekKey(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  }

  // ==========================================
  // SUPPLIERS
  // ==========================================
  addSupplier(supplier: Omit<Supplier, 'id'>): Supplier {
    const newSupplier = { ...supplier, id: this.generateId() };
    this._suppliers.update(list => [...list, newSupplier]);
    this.persist('pc_suppliers', this._suppliers());
    return newSupplier;
  }

  updateSupplier(id: string, updates: Partial<Supplier>): void {
    this._suppliers.update(list => list.map(s => s.id === id ? { ...s, ...updates } : s));
    this.persist('pc_suppliers', this._suppliers());
  }

  deleteSupplier(id: string): void {
    this._suppliers.update(list => list.filter(s => s.id !== id));
    this.persist('pc_suppliers', this._suppliers());
  }

  // ==========================================
  // ORDER RECEPTIONS
  // ==========================================
  addOrderReception(order: Omit<OrderReception, 'id' | 'receivedAt'>): OrderReception {
    const newOrder: OrderReception = {
      ...order,
      id: this.generateId(),
      receivedAt: new Date(),
    };
    this._orderReceptions.update(list => [newOrder, ...list]);
    this.persist('pc_order_receptions', this._orderReceptions());
    
    // Si queremos actualizar el stock (Opcional, pero util si el status es completed)
    if (newOrder.status === 'completed') {
       const product = this.getProduct(newOrder.productId);
       if (product) {
           this.updateProduct(product.id, { 
             currentStock: product.currentStock + newOrder.quantity 
           });
       }
    }
    
    return newOrder;
  }

  updateOrderReception(id: string, updates: Partial<OrderReception>): void {
    this._orderReceptions.update(list => list.map(o => o.id === id ? { ...o, ...updates } : o));
    this.persist('pc_order_receptions', this._orderReceptions());
  }

  deleteOrderReception(id: string): void {
    this._orderReceptions.update(list => list.filter(o => o.id !== id));
    this.persist('pc_order_receptions', this._orderReceptions());
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
    this._employees.set(this.load('pc_employees'));
    this._schedules.set(this.load('pc_schedules'));
    this._suppliers.set(this.load('pc_suppliers'));
    this._orderReceptions.set(this.load('pc_order_receptions'));
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
    // Seed Suppliers if empty
    if (this._suppliers().length === 0) {
      const demoSuppliers: Omit<Supplier, 'id'>[] = [
        { name: 'Avícola San Juan', contactName: 'Juan Rodríguez', phone: '555-1001', email: 'ventas@avicolasanjuan.com', active: true },
        { name: 'Distribuidora de Carnes', contactName: 'Pedro Martínez', phone: '555-1002', email: 'pedidos@districarnes.com', active: true },
        { name: 'Insumos El Chef', contactName: 'Ana Silva', phone: '555-1003', email: 'contacto@insumoselchef.com', active: true },
        { name: 'Empaques Modernos', contactName: 'Luis Torres', phone: '555-1004', email: 'ventas@empaques.com', active: true },
        { name: 'Limpieza Total', contactName: 'Marta Ruiz', phone: '555-1005', email: 'soporte@limpiezatotal.com', active: true },
      ];
      demoSuppliers.forEach(s => this.addSupplier(s));
    }

    if (this._products().length > 0) return;

    const suppliers = this._suppliers();
    
    const sPollo = suppliers[0];
    const sInsumos = suppliers[2];
    const sEmpaque = suppliers[3];
    const sLimpieza = suppliers[4];

    const demoProducts: Omit<Product, 'id' | 'lastUpdated'>[] = [
      { name: 'Pollo Entero', category: 'pollo', currentStock: 150, unit: 'unidad', minStock: 30, currentPrice: 4.50, createdBy: 'system', supplierId: sPollo.id, supplierName: sPollo.name },
      { name: 'Pechuga de Pollo', category: 'pollo', currentStock: 80, unit: 'kg', minStock: 20, currentPrice: 6.20, createdBy: 'system', supplierId: sPollo.id, supplierName: sPollo.name },
      { name: 'Muslos de Pollo', category: 'pollo', currentStock: 12, unit: 'kg', minStock: 15, currentPrice: 3.80, createdBy: 'system', supplierId: sPollo.id, supplierName: sPollo.name },
      { name: 'Alas de Pollo', category: 'pollo', currentStock: 45, unit: 'kg', minStock: 10, currentPrice: 3.50, createdBy: 'system', supplierId: sPollo.id, supplierName: sPollo.name },
      { name: 'Aceite Vegetal', category: 'insumos', currentStock: 25, unit: 'litro', minStock: 10, currentPrice: 2.80, createdBy: 'system', supplierId: sInsumos.id, supplierName: sInsumos.name },
      { name: 'Sal', category: 'insumos', currentStock: 8, unit: 'kg', minStock: 5, currentPrice: 0.50, createdBy: 'system', supplierId: sInsumos.id, supplierName: sInsumos.name },
      { name: 'Pimienta', category: 'insumos', currentStock: 3, unit: 'kg', minStock: 2, currentPrice: 8.00, createdBy: 'system', supplierId: sInsumos.id, supplierName: sInsumos.name },
      { name: 'Harina de Trigo', category: 'insumos', currentStock: 30, unit: 'kg', minStock: 10, currentPrice: 1.20, createdBy: 'system', supplierId: sInsumos.id, supplierName: sInsumos.name },
      { name: 'Cajas Delivery', category: 'empaque', currentStock: 200, unit: 'unidad', minStock: 50, currentPrice: 0.35, createdBy: 'system', supplierId: sEmpaque.id, supplierName: sEmpaque.name },
      { name: 'Bolsas Plásticas', category: 'empaque', currentStock: 5, unit: 'paquete', minStock: 10, currentPrice: 3.00, createdBy: 'system', supplierId: sEmpaque.id, supplierName: sEmpaque.name },
      { name: 'Desinfectante', category: 'limpieza', currentStock: 6, unit: 'litro', minStock: 3, currentPrice: 4.50, createdBy: 'system', supplierId: sLimpieza.id, supplierName: sLimpieza.name },
      { name: 'Guantes Descartables', category: 'limpieza', currentStock: 4, unit: 'paquete', minStock: 5, currentPrice: 5.00, createdBy: 'system', supplierId: sLimpieza.id, supplierName: sLimpieza.name },
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

    // Seed Demo Employees and Schedules
    if (this._employees().length === 0) {
      const demoEmployees = [
        { name: 'Juan Pérez', role: 'Cocinero', active: true, phone: '555-0101' },
        { name: 'María Gómez', role: 'Cajera', active: true, phone: '555-0102' },
        { name: 'Carlos Díaz', role: 'Delivery', active: true, phone: '555-0103' },
        { name: 'Ana López', role: 'Manager', active: true, phone: '555-0104' },
        { name: 'Luis Torres', role: 'Ayudante', active: true, phone: '555-0105' },
        { name: 'Sofía Ruiz', role: 'Cajera', active: true, phone: '555-0106' },
        { name: 'Miguel Ángel', role: 'Cocinero', active: true, phone: '555-0107' },
        { name: 'Laura Cruz', role: 'Limpieza', active: true, phone: '555-0108' },
      ];
      const emps = demoEmployees.map(e => this.addEmployee(e));

      // Seed schedule for the current week across different locations
      const weekKey = this.getCurrentWeekKey();
      const shifts: Omit<ScheduleShift, 'id'>[] = [];
      const defaultStart = '08:00';
      const defaultEnd = '16:00';
      const lateStart = '12:00';
      const lateEnd = '20:00';

      emps.forEach((emp, index) => {
        const loc = LOCATIONS[index % LOCATIONS.length];
        
        // Give everyone 5 days of work (Mon-Fri)
        for (let day = 0; day < 5; day++) {
            shifts.push({
                employeeId: emp.id,
                employeeName: emp.name,
                locationId: loc.id,
                locationName: loc.name,
                dayOfWeek: day,
                startTime: index % 2 === 0 ? defaultStart : lateStart,
                endTime: index % 2 === 0 ? defaultEnd : lateEnd,
                weekKey
            });
        }
      });
      
      shifts.forEach(s => this.addShift(s));
    }
  }
}
