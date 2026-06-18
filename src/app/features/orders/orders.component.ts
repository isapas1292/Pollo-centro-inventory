import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { OrderReception, Supplier, Product } from '../../core/models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="orders-page animate-fade-in-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">shopping_cart</mat-icon> Pedidos y Recepciones</h1>
          <p>Gestiona pedidos a proveedores y registra la llegada de mercancía.</p>
        </div>
        <div class="header-actions">
          <button (click)="openForm()" class="btn-primary">
            <mat-icon>add</mat-icon>
            <span>Hacer Pedido</span>
          </button>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="filter-section">
        <div class="search-box">
          <mat-icon class="search-icon">search</mat-icon>
          <input 
            type="text" 
            [(ngModel)]="searchTerm"
            placeholder="Buscar por producto o proveedor..." 
            class="search-input"
          >
        </div>
        <select [(ngModel)]="statusFilter" class="pc-select w-full sm:w-48">
          <option value="all">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="completed">Completados (Recibidos)</option>
        </select>
      </div>

      <!-- Orders Grid/Table -->
      <div class="activity-section animate-fade-in-up">
        <div class="section-header">
          <h3><mat-icon>list_alt</mat-icon> Registro de Pedidos</h3>
          <span class="view-all-link">{{ filteredOrders().length }} pedidos</span>
        </div>
        <div class="activity-table">
          <div class="activity-header-row">
            <span class="ath">Fecha</span>
            <span class="ath">Producto</span>
            <span class="ath">Proveedor</span>
            <span class="ath">Cant / Total</span>
            <span class="ath">Estado</span>
            <span class="ath ath-right">Acciones</span>
          </div>
          
          @if (filteredOrders().length === 0) {
            <div class="activity-empty">
              <mat-icon>shopping_cart</mat-icon>
              <p>No hay pedidos registrados</p>
            </div>
          } @else {
            @for (order of filteredOrders(); track order.id) {
              <div class="activity-row">
                <span class="atd date-col">
                  {{ order.receivedAt | date:'dd MMM yyyy' }}
                </span>
                <span class="atd atd-name">
                  <div class="product-icon"><mat-icon>inventory_2</mat-icon></div>
                  {{ order.productName }}
                </span>
                <span class="atd text-gray-300">
                  {{ order.supplierName }}
                </span>
                <span class="atd">
                  <div class="qty-total">
                    <span class="qty-badge">{{ order.quantity }} un.</span>
                    <span class="total-text">{{ order.total | currency }}</span>
                  </div>
                </span>
                <span class="atd">
                  <span class="status-badge" [class.pending]="order.status === 'pending'" [class.completed]="order.status === 'completed'">
                    @if (order.status === 'pending') {
                      <mat-icon>schedule</mat-icon> Pendiente
                    } @else {
                      <mat-icon>check_circle</mat-icon> Recibido
                    }
                  </span>
                </span>
                <span class="atd atd-right action-buttons">
                  @if (order.status === 'pending') {
                    <button (click)="sendEmail(order)" class="action-btn email-btn" title="Enviar Correo al Proveedor">
                      <mat-icon>mail</mat-icon>
                    </button>
                    <button (click)="markAsReceived(order)" class="action-btn receive-btn" title="Marcar como Recibido">
                      <mat-icon>inventory</mat-icon>
                    </button>
                  } @else {
                    <span class="text-gray-500 text-xs italic">Completado</span>
                  }
                </span>
              </div>
            }
          }
        </div>
      </div>
    </div>

    <!-- Order Form Modal -->
    @if (showForm()) {
      <div class="modal-overlay animate-fade-in">
        <div class="modal-content animate-slide-up">
          <div class="modal-header">
            <h3>Nuevo Pedido</h3>
            <button (click)="closeForm()" class="close-btn"><mat-icon>close</mat-icon></button>
          </div>

          <form (ngSubmit)="saveOrder()" class="modal-body">
            <div class="form-group">
              <label>Proveedor *</label>
              <select [(ngModel)]="formData.supplierId" name="supplierId" (change)="onSupplierChange()" required class="pc-input select-input">
                <option value="">Seleccione un proveedor</option>
                @for (sup of dataService.suppliers(); track sup.id) {
                  <option [value]="sup.id">{{ sup.name }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label>Producto *</label>
              <select [(ngModel)]="formData.productId" name="productId" (change)="onProductChange()" required class="pc-input select-input">
                <option value="">Seleccione un producto</option>
                @for (prod of availableProducts(); track prod.id) {
                  <option [value]="prod.id">{{ prod.name }} ({{ prod.category }})</option>
                }
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Cantidad *</label>
                <input type="number" [(ngModel)]="formData.quantity" name="quantity" required min="1" class="pc-input" (input)="calculateTotal()">
              </div>
              <div class="form-group">
                <label>Precio Unitario *</label>
                <div class="input-with-icon">
                  <span class="prefix">$</span>
                  <input type="number" [(ngModel)]="formData.price" name="price" required min="0" step="0.01" class="pc-input pl-8" (input)="calculateTotal()">
                </div>
              </div>
            </div>

            <div class="total-box">
              <span class="total-label">Total Estimado</span>
              <span class="total-value">{{ formData.total || 0 | currency }}</span>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="closeForm()" class="btn-secondary">Cancelar</button>
              <button type="submit" class="btn-primary" [disabled]="!isFormValid()">
                <mat-icon>send</mat-icon> <span>Crear Pedido</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .orders-page {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* ---- Header ---- */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .page-header h1 {
      font-family: var(--pc-font-heading);
      font-size: 1.8rem;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--pc-yellow);
    }

    .page-header p {
      color: var(--pc-text-muted);
      font-size: 0.9rem;
    }

    /* ---- Filters ---- */
    .filter-section {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      padding: 16px;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }

    .search-box {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      min-width: 200px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: var(--pc-text-muted);
      font-size: 20px;
    }

    .search-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-md);
      padding: 10px 12px 10px 40px;
      color: var(--pc-text-primary);
      font-family: var(--pc-font-body);
      font-size: 0.9rem;
      transition: all var(--pc-transition-fast);
    }

    .search-input:focus {
      outline: none;
      border-color: var(--pc-yellow);
      background: rgba(0, 0, 0, 0.3);
    }

    .pc-select {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-md);
      padding: 10px 12px;
      color: var(--pc-text-primary);
      font-family: var(--pc-font-body);
      font-size: 0.9rem;
      outline: none;
      transition: all var(--pc-transition-fast);
    }

    .pc-select:focus {
      border-color: var(--pc-yellow);
    }

    .pc-select option {
      background: var(--pc-bg-sidebar);
      color: white;
    }

    /* ---- Activity Table ---- */
    .activity-section {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      overflow: hidden;
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--pc-border);
    }

    .section-header h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      font-family: var(--pc-font-heading);
    }

    .section-header h3 mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--pc-yellow);
    }

    .view-all-link {
      color: var(--pc-text-muted);
      font-size: 0.82rem;
      font-weight: 500;
    }

    .activity-header-row {
      display: grid;
      grid-template-columns: 0.8fr 1.5fr 1.2fr 1fr 1fr 1fr;
      padding: 12px 20px;
      background: rgba(0, 0, 0, 0.2);
    }

    .ath {
      font-size: 0.72rem;
      color: var(--pc-text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .ath-right { text-align: right; }

    .activity-row {
      display: grid;
      grid-template-columns: 0.8fr 1.5fr 1.2fr 1fr 1fr 1fr;
      padding: 16px 20px;
      border-bottom: 1px solid var(--pc-border);
      align-items: center;
      transition: background var(--pc-transition-fast);
    }

    .activity-row:last-child { border-bottom: none; }
    .activity-row:hover { background: rgba(255, 255, 255, 0.02); }

    .atd { font-size: 0.88rem; color: var(--pc-text-secondary); }
    .atd-right { text-align: right; }

    .date-col {
      font-weight: 500;
      font-size: 0.85rem;
    }

    .atd-name {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
      color: var(--pc-text-primary);
    }

    .product-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(59, 130, 246, 0.15);
      color: #60A5FA;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .product-icon mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .qty-total {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .qty-badge {
      background: rgba(242, 201, 76, 0.12);
      color: var(--pc-yellow);
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.75rem;
      display: inline-block;
      width: fit-content;
    }

    .total-text {
      font-weight: 600;
      color: var(--pc-text-primary);
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .status-badge mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .status-badge.pending {
      background: rgba(245, 158, 11, 0.15);
      color: #FBBF24;
    }

    .status-badge.completed {
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
    }

    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      align-items: center;
    }

    .action-btn {
      background: transparent;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all var(--pc-transition-fast);
      color: var(--pc-text-muted);
    }

    .action-btn:hover { background: rgba(255, 255, 255, 0.05); }
    .email-btn:hover { color: #60A5FA; background: rgba(59, 130, 246, 0.1); }
    .receive-btn:hover { color: #34D399; background: rgba(16, 185, 129, 0.1); }

    .activity-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
      gap: 8px;
    }

    .activity-empty mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      opacity: 0.3;
    }

    /* ---- Modals ---- */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 15, 26, 0.8);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-content {
      background: var(--pc-bg-sidebar);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      width: 100%;
      max-width: 500px;
      box-shadow: var(--pc-shadow-xl);
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--pc-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-header h3 {
      font-family: var(--pc-font-heading);
      font-size: 1.2rem;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--pc-text-muted);
      cursor: pointer;
      display: flex;
      padding: 4px;
      border-radius: 4px;
      transition: all var(--pc-transition-fast);
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--pc-text-primary);
    }

    .modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-group label {
      font-size: 0.85rem;
      color: var(--pc-text-secondary);
      font-weight: 500;
    }

    .pc-input {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-md);
      padding: 10px 12px;
      color: var(--pc-text-primary);
      font-family: var(--pc-font-body);
      transition: all var(--pc-transition-fast);
    }

    .select-input {
      appearance: none;
      cursor: pointer;
    }
    .select-input option {
      background: var(--pc-bg-sidebar);
      color: white;
    }

    .pc-input:focus {
      outline: none;
      border-color: var(--pc-yellow);
      background: rgba(0, 0, 0, 0.3);
    }

    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
    }

    .prefix {
      position: absolute;
      left: 12px;
      color: var(--pc-text-muted);
    }
    
    .pl-8 { padding-left: 2rem; width: 100%; box-sizing: border-box; }

    .total-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-md);
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .total-label {
      color: var(--pc-text-secondary);
      font-weight: 500;
    }

    .total-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--pc-yellow);
    }

    .modal-footer {
      padding-top: 24px;
      margin-top: 8px;
      border-top: 1px solid var(--pc-border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--pc-border);
      color: var(--pc-text-primary);
      padding: 8px 16px;
      border-radius: var(--pc-radius-md);
      cursor: pointer;
      font-weight: 500;
      transition: all var(--pc-transition-fast);
    }

    .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); }

    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: var(--pc-yellow);
      color: #1A1A2E;
      font-weight: 700;
      border: none;
      padding: 10px 20px;
      border-radius: var(--pc-radius-md);
      cursor: pointer;
      transition: all var(--pc-transition-fast);
      font-size: 0.95rem;
    }

    .btn-primary:hover:not(:disabled) {
      background: #FBBF24;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(242, 201, 76, 0.2);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      filter: grayscale(1);
    }
  `]
})
export class OrdersComponent {
  dataService = inject(DataService);

  searchTerm = signal('');
  statusFilter = signal('all');
  showForm = signal(false);

  formData: Partial<OrderReception> = this.getInitialFormData();

  filteredOrders = computed(() => {
    let list = this.dataService.orderReceptions();
    const term = this.searchTerm().toLowerCase();
    const status = this.statusFilter();

    if (status !== 'all') {
      list = list.filter(o => o.status === status);
    }

    if (term) {
      list = list.filter(o => 
        o.productName.toLowerCase().includes(term) ||
        o.supplierName.toLowerCase().includes(term)
      );
    }

    // Sort by date descending
    return list.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  });

  availableProducts = computed(() => {
    // Si queremos filtrar por el proveedor seleccionado, podemos hacerlo aquí.
    // Pero es mejor mostrar todos y tal vez sugerir.
    return this.dataService.products();
  });

  private getInitialFormData(): Partial<OrderReception> {
    return {
      supplierId: '',
      productId: '',
      quantity: 1,
      price: 0,
      total: 0,
      status: 'pending'
    };
  }

  openForm() {
    this.formData = this.getInitialFormData();
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
  }

  onSupplierChange() {
    // Optional: filter products or prepopulate based on supplier history
  }

  onProductChange() {
    const product = this.dataService.products().find(p => p.id === this.formData.productId);
    if (product) {
      this.formData.price = product.currentPrice;
      this.calculateTotal();
    }
  }

  calculateTotal() {
    if (this.formData.quantity && this.formData.price) {
      this.formData.total = this.formData.quantity * this.formData.price;
    } else {
      this.formData.total = 0;
    }
  }

  isFormValid(): boolean {
    return !!(this.formData.supplierId && this.formData.productId && this.formData.quantity && this.formData.price);
  }

  saveOrder() {
    if (!this.isFormValid()) return;

    const supplier = this.dataService.suppliers().find(s => s.id === this.formData.supplierId);
    const product = this.dataService.products().find(p => p.id === this.formData.productId);

    if (!supplier || !product) return;

    const orderToSave: Omit<OrderReception, 'id' | 'receivedAt'> = {
      supplierId: supplier.id,
      supplierName: supplier.name,
      productId: product.id,
      productName: product.name,
      quantity: this.formData.quantity || 1,
      price: this.formData.price || 0,
      total: this.formData.total || 0,
      status: 'pending',
      receivedBy: 'System' // En una app real vendría de authService
    };

    const createdOrder = this.dataService.addOrderReception(orderToSave);
    this.closeForm();
    
    // Preguntar si quiere enviar correo inmediatamente
    if (confirm('Pedido creado exitosamente. ¿Deseas enviar el correo al proveedor ahora?')) {
      this.sendEmail(createdOrder);
    }
  }

  markAsReceived(order: OrderReception) {
    if (confirm(`¿Marcar la llegada de ${order.quantity}x ${order.productName}? Esto actualizará el inventario.`)) {
      this.dataService.updateOrderReception(order.id, { status: 'completed' });
      // En el DataService podríamos agregar lógica para actualizar el inventario cuando pasa a completed,
      // O lo hacemos directamente aquí:
      const product = this.dataService.products().find(p => p.id === order.productId);
      if (product) {
        this.dataService.updateProduct(product.id, {
          currentStock: product.currentStock + order.quantity
        });
      }
    }
  }

  sendEmail(order: OrderReception) {
    const supplier = this.dataService.suppliers().find(s => s.id === order.supplierId);
    if (!supplier || !supplier.email) {
      alert('El proveedor no tiene un correo electrónico configurado.');
      return;
    }

    const subject = encodeURIComponent(`Nuevo Pedido de ${order.productName} - Pollo Centro`);
    const body = encodeURIComponent(
      `Hola ${supplier.contactName || supplier.name},\n\n` +
      `Por medio de la presente solicito el siguiente pedido:\n\n` +
      `- Producto: ${order.productName}\n` +
      `- Cantidad: ${order.quantity}\n` +
      `- Precio Acordado: $${order.price}\n` +
      `- Total Estimado: $${order.total}\n\n` +
      `Por favor confirmar la recepción de este pedido y el tiempo estimado de entrega.\n\n` +
      `Saludos cordiales,\nEquipo Pollo Centro`
    );

    window.location.href = `mailto:${supplier.email}?subject=${subject}&body=${body}`;
  }
}
