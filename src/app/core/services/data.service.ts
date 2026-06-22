import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Product, Recipe, RecipeLog, PriceRecord, StockAlert, AppUser, AuditLog, Employee, ScheduleShift, Location, Supplier, OrderReception, Dispatch, DispatchItem } from '../models';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

/**
 * DataService — Capa de datos reactiva respaldada por la API .NET (PolloCentro.Api).
 *
 * Todas las colecciones se cargan desde el backend al iniciar y se mantienen en
 * Angular Signals. Las escrituras actualizan el signal de forma optimista (para una
 * UI instantánea) y se persisten vía HTTP; tras confirmar, se recarga la colección
 * para adoptar los identificadores reales del servidor.
 */
@Injectable({ providedIn: 'root' })
export class DataService {

  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly api = environment.apiUrl;

  // Las alertas comienzan a aparecer cuando el stock baja del mínimo × este factor
  // (punto intermedio / "stock bajo"). Al llegar o bajar del mínimo pasan a "crítico".

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
  private _dispatches = signal<Dispatch[]>([]);
  private _locations = signal<Location[]>([]);

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
  readonly dispatches = this._dispatches.asReadonly();
  readonly locations = this._locations.asReadonly();

  // Indicador de carga inicial (para spinners/barras de progreso globales).
  private _loading = signal(true);
  readonly loading = this._loading.asReadonly();

  // --- Computed signals ---
  readonly activeAlerts = computed(() => this._alerts().filter(a => a.status === 'active'));
  readonly totalProducts = computed(() => this._products().length);
  readonly lowStockProducts = computed(() =>
    this._products().filter(p => p.currentStock <= p.minStock)
  );

  constructor() {
    this.loadAll();
  }

  // ==========================================
  // CARGA INICIAL
  // ==========================================
  private async loadAll(): Promise<void> {
    this._loading.set(true);
    // Colecciones restringidas: solo se piden si el rol puede verlas (evita 403 inútiles).
    const role = this.auth.userRole();
    const tasks: Promise<unknown>[] = [
      this.reloadProducts(), this.reloadRecipes(), this.reloadRecipeLogs(),
      this.reloadPrices(), this.reloadAlerts(), this.reloadEmployees(),
      this.reloadSchedules(), this.fetchSuppliers(), this.reloadOrders(),
      this.reloadDispatches(), this.reloadLocations(),
    ];
    if (role === 'admin') tasks.push(this.reloadUsers());
    if (role === 'admin' || role === 'manager') tasks.push(this.reloadAudit());
    try { await Promise.all(tasks); } finally { this._loading.set(false); }
  }

  private async getList<T>(path: string): Promise<T[]> {
    try {
      return await firstValueFrom(this.http.get<T[]>(`${this.api}/${path}`));
    } catch (e) {
      console.error(`Error GET /${path}`, e);
      return [];
    }
  }

  private async reloadProducts() { this._products.set(await this.getList<Product>('inventory')); }
  private async reloadRecipes() { this._recipes.set(await this.getList<Recipe>('recipes')); }
  private async reloadRecipeLogs() { this._recipeLogs.set(await this.getList<RecipeLog>('recipes/logs')); }
  private async reloadPrices() { this._priceHistory.set(await this.getList<PriceRecord>('prices')); }
  private async reloadAlerts() { this._alerts.set(await this.getList<StockAlert>('alerts')); }
  private async reloadUsers() { this._users.set(await this.getList<AppUser>('users')); }
  private async reloadAudit() { this._auditLogs.set(await this.getList<AuditLog>('audit')); }
  private async reloadEmployees() { this._employees.set(await this.getList<Employee>('employees')); }
  private async reloadSchedules() { this._schedules.set(await this.getList<ScheduleShift>('schedules')); }
  private async reloadOrders() { this._orderReceptions.set(await this.getList<OrderReception>('orders')); }
  private async reloadDispatches() { this._dispatches.set(await this.getList<Dispatch>('dispatches')); }
  private async reloadLocations() { this._locations.set(await this.getList<Location>('locations')); }

  private isServerId(id: string): boolean { return /^\d+$/.test(id); }

  private post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${this.api}/${path}`, body));
  }
  private put<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.put<T>(`${this.api}/${path}`, body));
  }
  private del(path: string): Promise<unknown> {
    return firstValueFrom(this.http.delete(`${this.api}/${path}`));
  }

  // ==========================================
  // PRODUCTS
  // ==========================================
  addProduct(product: Omit<Product, 'id' | 'lastUpdated'>): Product {
    const newProduct: Product = { ...product, id: this.generateId(), lastUpdated: new Date() };
    this._products.update(list => [...list, newProduct]);

    const payload = {
      name: product.name, category: product.category, unit: product.unit,
      currentStock: product.currentStock, minStock: product.minStock,
      currentPrice: product.currentPrice, supplierId: product.supplierId,
    };
    this.post<Product>('inventory', payload)
      .then(created => {
        this.reloadProducts();
        this.reloadAlerts();
        // Registra el precio inicial con el id real del servidor.
        return this.post('prices', {
          productId: created.id, productName: created.name,
          price: created.currentPrice, recordedBy: product.createdBy,
        }).then(() => this.reloadPrices());
      })
      .catch(e => console.error('addProduct', e));

    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>): void {
    this._products.update(list =>
      list.map(p => p.id === id ? { ...p, ...updates, lastUpdated: new Date() } : p)
    );

    const product = this._products().find(p => p.id === id);
    if (!product) return;

    if (updates.currentPrice !== undefined) {
      this.addPriceRecord({ productId: id, productName: product.name, price: updates.currentPrice, recordedBy: 'system' });
    }
    if (this.isServerId(id)) {
      const payload = {
        name: product.name, category: product.category, unit: product.unit,
        currentStock: product.currentStock, minStock: product.minStock,
        currentPrice: product.currentPrice, supplierId: product.supplierId,
      };
      this.put<Product>('inventory/' + id, payload)
        .then(updated => {
          this._products.update(list => list.map(p => p.id === id ? { ...p, ...updated } : p));
          this.reloadAlerts();
        })
        .catch(e => console.error('updateProduct', e));
    }
  }

  restockProduct(id: string, quantity: number): void {
    const product = this.getProduct(id);
    if (!product || quantity <= 0) return;
    this.updateProduct(id, { currentStock: product.currentStock + quantity });
  }

  deleteProduct(id: string): void {
    this._products.update(list => list.filter(p => p.id !== id));
    if (this.isServerId(id)) {
      // Ya se quitó del signal; no hace falta refetch de toda la lista.
      this.del('inventory/' + id).catch(e => console.error('deleteProduct', e));
    }
  }

  getProduct(id: string): Product | undefined {
    return this._products().find(p => p.id === id);
  }

  // ==========================================
  // RECIPES
  // ==========================================
  addRecipe(recipe: Omit<Recipe, 'id' | 'createdAt'>): Recipe {
    const newRecipe: Recipe = { ...recipe, id: this.generateId(), createdAt: new Date() };
    this._recipes.update(list => [...list, newRecipe]);

    // Reemplaza el temporal con la receta del servidor (id real + costo recalculado).
    this.post<Recipe>('recipes', {
      name: recipe.name, description: recipe.description,
      ingredients: recipe.ingredients, estimatedCost: recipe.estimatedCost,
      salePrice: recipe.salePrice, createdBy: recipe.createdBy,
    }).then(created => this._recipes.update(list => list.map(r => r.id === newRecipe.id ? created : r)))
      .catch(e => console.error('addRecipe', e));

    return newRecipe;
  }

  updateRecipe(id: string, updates: Partial<Recipe>): void {
    this._recipes.update(list => list.map(r => r.id === id ? { ...r, ...updates } : r));
    const recipe = this._recipes().find(r => r.id === id);
    if (recipe && this.isServerId(id)) {
      this.put<Recipe>('recipes/' + id, {
        name: recipe.name, description: recipe.description,
        ingredients: recipe.ingredients, estimatedCost: recipe.estimatedCost,
        salePrice: recipe.salePrice, createdBy: recipe.createdBy,
      }).then(updated => this._recipes.update(list => list.map(r => r.id === id ? updated : r)))
        .catch(e => console.error('updateRecipe', e));
    }
  }

  deleteRecipe(id: string): void {
    this._recipes.update(list => list.filter(r => r.id !== id));
    if (this.isServerId(id)) {
      this.del('recipes/' + id).catch(e => console.error('deleteRecipe', e));
    }
  }

  /**
   * Prepara una receta. La validación y el descuento de stock se realizan en el
   * servidor; aquí se valida primero localmente y se recargan productos y registros.
   */
  prepareRecipe(recipeId: string, preparedBy: string, quantity: number = 1): RecipeLog | null {
    const recipe = this._recipes().find(r => r.id === recipeId);
    if (!recipe) return null;

    const check = this.canPrepareRecipe(recipeId, quantity);
    if (!check.canPrepare) return null;

    const ingredientsUsed = recipe.ingredients.map(ing => ({
      productId: ing.productId,
      productName: ing.productName || this.getProduct(ing.productId)?.name || '',
      quantity: ing.quantity * quantity,
    }));
    const totalCost = ingredientsUsed.reduce((sum, ing) => {
      const product = this.getProduct(ing.productId);
      return sum + (product ? ing.quantity * product.currentPrice : 0);
    }, 0);

    const log: RecipeLog = {
      id: this.generateId(), recipeId, recipeName: recipe.name,
      preparedBy, preparedAt: new Date(), ingredientsUsed, totalCost, quantity,
    };
    this._recipeLogs.update(list => [log, ...list]);

    // La receta queda "hecha" en inventario (stock preparado sube).
    this._recipes.update(list => list.map(r =>
      r.id === recipeId ? { ...r, preparedStock: (r.preparedStock ?? 0) + quantity } : r));

    if (this.isServerId(recipeId)) {
      this.post('recipes/' + recipeId + '/prepare', { preparedBy, quantity })
        .then(() => { this.reloadProducts(); this.reloadRecipeLogs(); this.reloadRecipes(); })
        .catch(e => console.error('prepareRecipe', e));
    }
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
    const newRecord: PriceRecord = { ...record, id: this.generateId(), recordedAt: new Date() };
    this._priceHistory.update(list => [newRecord, ...list]);

    if (this.isServerId(record.productId)) {
      // El historial es solo de lectura; el registro optimista ya se muestra (sin refetch).
      this.post('prices', {
        productId: record.productId, productName: record.productName,
        price: record.price, supplier: record.supplier, recordedBy: record.recordedBy,
      }).catch(e => console.error('addPriceRecord', e));
    }
  }

  getPriceHistory(productId: string): PriceRecord[] {
    return this._priceHistory().filter(p => p.productId === productId);
  }

  // ==========================================
  // ALERTS
  // ==========================================
  /**
   * Envía (o reenvía) la alerta por WhatsApp pidiéndoselo al backend, que la entrega
   * vía WhatsApp Business Cloud API (Meta). Marca la alerta como notificada.
   */
  notifyViaWhatsApp(alert: StockAlert): void {
    this._alerts.update(list => list.map(a => a.id === alert.id ? { ...a, whatsappSent: true } : a));
    if (this.isServerId(alert.id)) {
      this.post('alerts/' + alert.id + '/notify', {})
        .then(() => this.reloadAlerts()).catch(e => console.error('notifyAlert', e));
    }
  }

  /** Abre el cliente de correo con un pedido de reabastecimiento dirigido a un proveedor. */
  emailSupplier(supplier: Supplier, subject: string, body: string): void {
    if (typeof window === 'undefined') return;
    const to = supplier.email ?? '';
    const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_self');
  }

  resolveAlert(id: string): void {
    this._alerts.update(list =>
      list.map(a => a.id === id ? { ...a, status: 'resolved' as const, resolvedAt: new Date() } : a)
    );
    if (this.isServerId(id)) {
      this.put('alerts/' + id + '/resolve', {}).then(() => this.reloadAlerts()).catch(e => console.error('resolveAlert', e));
    }
  }

  markAlertWhatsappSent(id: string): void {
    this._alerts.update(list => list.map(a => a.id === id ? { ...a, whatsappSent: true } : a));
    if (this.isServerId(id)) {
      this.put('alerts/' + id + '/whatsapp', {}).then(() => this.reloadAlerts()).catch(e => console.error('markAlertWhatsappSent', e));
    }
  }

  // ==========================================
  // USERS
  // ==========================================
  addUser(user: Omit<AppUser, 'uid' | 'createdAt'>, password: string): AppUser {
    const newUser: AppUser = { ...user, uid: this.generateId(), createdAt: new Date() };
    this._users.update(list => [...list, newUser]);

    this.post<AppUser>('users', {
      email: user.email, displayName: user.displayName, role: user.role,
      phone: user.phone, active: user.active, password,
    }).then(created => this._users.update(list => list.map(u => u.uid === newUser.uid ? created : u)))
      .catch(e => console.error('addUser', e));

    return newUser;
  }

  updateUser(uid: string, updates: Partial<AppUser>): void {
    this._users.update(list => list.map(u => u.uid === uid ? { ...u, ...updates } : u));
    const user = this._users().find(u => u.uid === uid);
    if (user && this.isServerId(uid)) {
      this.put<AppUser>('users/' + uid, {
        email: user.email, displayName: user.displayName, role: user.role,
        phone: user.phone, active: user.active,
      }).then(updated => this._users.update(list => list.map(u => u.uid === uid ? { ...u, ...updated } : u)))
        .catch(e => console.error('updateUser', e));
    }
  }

  deleteUser(uid: string): void {
    this._users.update(list => list.filter(u => u.uid !== uid));
    if (this.isServerId(uid)) {
      this.del('users/' + uid).catch(e => console.error('deleteUser', e));
    }
  }

  // ==========================================
  // AUDIT
  // ==========================================
  addAuditLog(userId: string, userName: string, action: string, details: string): void {
    const log: AuditLog = {
      id: this.generateId(), userId, userName, action, details, timestamp: new Date(),
    };
    this._auditLogs.update(list => [log, ...list]);
    this.post('audit', { userId, userName, action, details })
      .then(() => this.reloadAudit()).catch(e => console.error('addAuditLog', e));
  }

  // ==========================================
  // EMPLOYEES & SCHEDULES
  // ==========================================
  addEmployee(employee: Omit<Employee, 'id'>): Employee {
    const newEmp = { ...employee, id: this.generateId() };
    this._employees.update(list => [...list, newEmp]);
    this.post<Employee>('employees', employee)
      .then(created => this._employees.update(list => list.map(e => e.id === newEmp.id ? created : e)))
      .catch(e => console.error('addEmployee', e));
    return newEmp;
  }

  updateEmployee(id: string, updates: Partial<Employee>): void {
    this._employees.update(list => list.map(e => e.id === id ? { ...e, ...updates } : e));
    const emp = this._employees().find(e => e.id === id);
    if (emp && this.isServerId(id)) {
      this.put<Employee>('employees/' + id, {
        name: emp.name, role: emp.role, phone: emp.phone, active: emp.active,
        locationId: emp.locationId, locationName: emp.locationName,
      }).then(updated => this._employees.update(list => list.map(e => e.id === id ? { ...e, ...updated } : e)))
        .catch(e => console.error('updateEmployee', e));
    }
  }

  deleteEmployee(id: string): void {
    this._employees.update(list => list.filter(e => e.id !== id));
    this._schedules.update(list => list.filter(s => s.employeeId !== id));
    if (this.isServerId(id)) {
      this.del('employees/' + id).catch(e => console.error('deleteEmployee', e));
    }
  }

  addShift(shift: Omit<ScheduleShift, 'id'>): ScheduleShift {
    const newShift = { ...shift, id: this.generateId() };
    this._schedules.update(list => [...list, newShift]);
    this.post<ScheduleShift>('schedules', shift)
      .then(created => this._schedules.update(list => list.map(s => s.id === newShift.id ? created : s)))
      .catch(e => console.error('addShift', e));
    return newShift;
  }

  /**
   * Alta masiva de turnos en UNA sola petición (varios días o horario automático).
   * Si se pasa replaceWeekKey, el backend borra primero los turnos de esa semana.
   */
  addShiftsBulk(shifts: Omit<ScheduleShift, 'id'>[], replaceWeekKey?: string): void {
    const temp = shifts.map(s => ({ ...s, id: this.generateId() }));
    this._schedules.update(list => {
      const base = replaceWeekKey ? list.filter(s => s.weekKey !== replaceWeekKey) : list;
      return [...base, ...temp];
    });
    this.post('schedules/bulk', { replaceWeekKey, shifts })
      .then(() => this.reloadSchedules())
      .catch(e => console.error('addShiftsBulk', e));
  }

  updateShift(id: string, updates: Partial<ScheduleShift>): void {
    this._schedules.update(list => list.map(s => s.id === id ? { ...s, ...updates } : s));
    const shift = this._schedules().find(s => s.id === id);
    if (shift && this.isServerId(id)) {
      this.put<ScheduleShift>('schedules/' + id, shift)
        .then(updated => this._schedules.update(list => list.map(s => s.id === id ? updated : s)))
        .catch(e => console.error('updateShift', e));
    }
  }

  deleteShift(id: string): void {
    this._schedules.update(list => list.filter(s => s.id !== id));
    if (this.isServerId(id)) {
      this.del('schedules/' + id).catch(e => console.error('deleteShift', e));
    }
  }

  getShiftsForWeek(weekKey: string): ScheduleShift[] {
    return this._schedules().filter(s => s.weekKey === weekKey);
  }

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
    this._suppliers.set(await this.getList<Supplier>('suppliers'));
  }

  async addSupplier(supplier: Omit<Supplier, 'id'>) {
    try {
      const result = await this.post<Supplier>('suppliers', supplier);
      this._suppliers.update(list => [...list, result]);
    } catch (e) {
      console.error('Error adding supplier', e);
    }
  }

  async updateSupplier(id: string, updates: Partial<Supplier>) {
    try {
      const result = await this.put<Supplier>('suppliers/' + id, updates);
      this._suppliers.update(list => list.map(s => s.id === id ? { ...s, ...result } : s));
    } catch (e) {
      console.error('Error updating supplier', e);
    }
  }

  async deleteSupplier(id: string) {
    try {
      await this.del('suppliers/' + id);
      this._suppliers.update(list => list.filter(s => s.id !== id));
    } catch (e) {
      console.error('Error deleting supplier', e);
    }
  }

  // ==========================================
  // ORDER RECEPTIONS
  // ==========================================
  addOrderReception(order: Omit<OrderReception, 'id' | 'receivedAt'>): OrderReception {
    const newOrder: OrderReception = { ...order, id: this.generateId(), receivedAt: new Date() };
    this._orderReceptions.update(list => [newOrder, ...list]);
    if (order.status === 'pending') {
      this._alerts.update(list => list.map(a => a.productId === order.productId
        ? { ...a, status: 'resolved' as const, resolvedAt: new Date() }
        : a));
    }

    this.post<OrderReception>('orders', {
      supplierId: order.supplierId, supplierName: order.supplierName,
      productId: order.productId, productName: order.productName,
      quantity: order.quantity, price: order.price, total: order.total,
      receivedBy: order.receivedBy, status: order.status,
    }).then(created => {
      this._orderReceptions.update(list => list.map(o => o.id === newOrder.id ? created : o));
      // Solo si la mercancía entró (completed) cambió el stock en el servidor → resincronizar.
      if (order.status === 'completed') {
        this._alerts.update(list => list.filter(a => a.productId !== order.productId));
        this.reloadProducts(); this.reloadAlerts();
      }
    }).catch(e => console.error('addOrderReception', e));

    return newOrder;
  }

  updateOrderReception(id: string, updates: Partial<OrderReception>): void {
    const previous = this._orderReceptions().find(o => o.id === id);
    this._orderReceptions.update(list => list.map(o => o.id === id ? { ...o, ...updates } : o));
    const order = this._orderReceptions().find(o => o.id === id);
    const justReceived = previous?.status !== 'completed' && order?.status === 'completed';
    if (order && justReceived) {
      this._products.update(list => list.map(p => p.id === order.productId
        ? { ...p, currentStock: p.currentStock + order.quantity, lastUpdated: new Date() }
        : p));
      this._alerts.update(list => list.filter(a => a.productId !== order.productId));
    }
    if (order && this.isServerId(id)) {
      this.put<OrderReception>('orders/' + id, {
        supplierId: order.supplierId, supplierName: order.supplierName,
        productId: order.productId, productName: order.productName,
        quantity: order.quantity, price: order.price, total: order.total,
        receivedBy: order.receivedBy, status: order.status,
      }).then(updated => {
        this._orderReceptions.update(list => list.map(o => o.id === id ? updated : o));
        // Solo resincroniza inventario/alertas si la mercancía acaba de entrar.
        if (justReceived) { this.reloadProducts(); this.reloadAlerts(); }
      }).catch(e => console.error('updateOrderReception', e));
    }
  }

  deleteOrderReception(id: string): void {
    this._orderReceptions.update(list => list.filter(o => o.id !== id));
    if (this.isServerId(id)) {
      this.del('orders/' + id).catch(e => console.error('deleteOrderReception', e));
    }
  }

  // ==========================================
  // DISPATCHES (envíos a locales)
  // ==========================================
  addDispatch(dispatch: Omit<Dispatch, 'id' | 'createdAt'>): Dispatch {
    const newDispatch: Dispatch = { ...dispatch, id: this.generateId(), createdAt: new Date() };
    this._dispatches.update(list => [newDispatch, ...list]);

    this.post<Dispatch>('dispatches', {
      locationId: dispatch.locationId, locationName: dispatch.locationName,
      items: dispatch.items, dispatchedById: dispatch.dispatchedById,
      dispatchedBy: dispatch.dispatchedBy, note: dispatch.note,
    }).then(() => {
      this.reloadDispatches();
      this.reloadProducts();
      this.reloadAlerts();
      // El backend descuenta el stock de recetas preparadas; refrescamos.
      if (dispatch.items.some(it => it.type === 'receta')) this.reloadRecipes();
    }).catch(e => console.error('addDispatch', e));

    // Refleja de forma optimista la baja del stock preparado de las recetas enviadas.
    for (const it of dispatch.items) {
      if (it.type === 'receta') {
        this._recipes.update(list => list.map(r =>
          r.id === it.refId ? { ...r, preparedStock: Math.max(0, (r.preparedStock ?? 0) - it.quantity) } : r));
      }
    }

    return newDispatch;
  }

  deleteDispatch(id: string): void {
    this._dispatches.update(list => list.filter(d => d.id !== id));
    if (this.isServerId(id)) {
      this.del('dispatches/' + id).then(() => this.reloadDispatches()).catch(e => console.error('deleteDispatch', e));
    }
  }

  // ==========================================
  // UTIL
  // ==========================================
  private generateId(): string {
    return 'tmp-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }
}
