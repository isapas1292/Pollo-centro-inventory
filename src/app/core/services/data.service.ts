import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Product, Recipe, RecipeLog, PriceRecord, StockAlert, AppUser, AuditLog, Employee, ScheduleShift, LOCATIONS, Supplier, OrderReception } from '../models';

/**
 * DataService — Simulates a real-time database using localStorage + signals.
 * Architecture ready to swap with Firebase Firestore when credentials are configured.
 * All data is reactive via Angular Signals.
 */
@Injectable({ providedIn: 'root' })
export class DataService {

  private http = inject(HttpClient);

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
  async fetchSuppliers() {
    try {
      const result = await firstValueFrom(this.http.get<Supplier[]>('http://localhost:3000/api/suppliers'));
      this._suppliers.set(result);
    } catch (e) {
      console.error('Error fetching suppliers', e);
      this._suppliers.set([]);
    }
  }

  async addSupplier(supplier: Omit<Supplier, 'id'>) {
    try {
      const result = await firstValueFrom(this.http.post<Supplier>('http://localhost:3000/api/suppliers', supplier));
      this._suppliers.update(list => [...list, result]);
    } catch(e) {
      console.error('Error adding supplier', e);
    }
  }

  async updateSupplier(id: string, updates: Partial<Supplier>) {
    try {
      const result = await firstValueFrom(this.http.put<Supplier>(`http://localhost:3000/api/suppliers/${id}`, updates));
      this._suppliers.update(list => list.map(s => s.id === id ? { ...s, ...result } : s));
    } catch(e) {
      console.error('Error updating supplier', e);
    }
  }

  async deleteSupplier(id: string) {
    try {
      await firstValueFrom(this.http.delete(`http://localhost:3000/api/suppliers/${id}`));
      this._suppliers.update(list => list.filter(s => s.id !== id));
    } catch(e) {
      console.error('Error deleting supplier', e);
    }
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
    this.http.get<Product[]>('http://localhost:3000/api/inventory').subscribe({
      next: (data) => {
        this._products.set(data);
        this.persist('pc_products', data);
      },
      error: (err) => {
        console.error('Error fetching inventory from backend:', err);
        this._products.set([]);
      }
    });

    this._recipes.set(this.load('pc_recipes'));
    this._recipeLogs.set(this.load('pc_recipe_logs'));
    this._priceHistory.set(this.load('pc_price_history'));
    this._alerts.set(this.load('pc_alerts'));
    this._users.set(this.load('pc_users'));
    this._auditLogs.set(this.load('pc_audit_logs'));
    this._employees.set(this.load('pc_employees'));
    this._schedules.set(this.load('pc_schedules'));
    this.fetchSuppliers(); // Fetch from backend
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
    // Seed Suppliers si está vacío ya no lo usaremos aquí
    // para no contaminar la base de datos real.

    // Products, Price History, and Recipes mock data removed as per request

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
