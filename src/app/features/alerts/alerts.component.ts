import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { DataService } from '../../core/services/data.service';
import { StockAlert, Supplier } from '../../core/models';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatChipsModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon text-red">warning</mat-icon> Centro de Alertas</h1>
          <p>Monitorea y gestiona los productos con niveles bajos o críticos de stock</p>
        </div>

        <div class="filter-pills">
          <button class="pill" [class.active]="filter() === 'all'" (click)="filter.set('all')">Todas</button>
          <button class="pill pill-danger" [class.active]="filter() === 'active'" (click)="filter.set('active')">
            Activas ({{ activeCount() }})
          </button>
          <button class="pill pill-success" [class.active]="filter() === 'resolved'" (click)="filter.set('resolved')">
            Resueltas
          </button>
        </div>
      </div>

      <!-- Alerts List -->
      <div class="alerts-grid stagger-children">
        @for (alert of filteredAlerts(); track alert.id) {
          <div class="alert-card animate-fade-in-up"
               [class.resolved-card]="alert.status === 'resolved'"
               [class.warning-card]="alert.status === 'active' && !isCritical(alert)">
            <div class="alert-indicator"
                 [class.bg-red]="alert.status === 'active' && isCritical(alert)"
                 [class.bg-yellow]="alert.status === 'active' && !isCritical(alert)"
                 [class.bg-green]="alert.status === 'resolved'"></div>

            <div class="alert-header">
              <div class="alert-title">
                <mat-icon [class.text-red]="alert.status === 'active' && isCritical(alert)"
                          [class.text-yellow]="alert.status === 'active' && !isCritical(alert)"
                          [class.text-green]="alert.status === 'resolved'">
                  {{ alert.status === 'active' ? (isCritical(alert) ? 'error_outline' : 'warning_amber') : 'check_circle' }}
                </mat-icon>
                <h3>{{ alert.productName }}</h3>
              </div>
              <span class="status-badge"
                    [class.badge-active]="alert.status === 'active' && isCritical(alert)"
                    [class.badge-warning]="alert.status === 'active' && !isCritical(alert)"
                    [class.badge-resolved]="alert.status === 'resolved'">
                {{ alert.status === 'active' ? (isCritical(alert) ? 'Crítico' : 'Stock Bajo') : 'Resuelto' }}
              </span>
            </div>

            <div class="alert-body">
              <div class="stock-info">
                <div class="stock-label">Stock Actual</div>
                <div class="stock-value" [class.text-red]="isCritical(alert)" [class.text-yellow]="!isCritical(alert)">
                  {{ alert.currentStock }} {{ alert.unit }}
                </div>
              </div>
              <div class="stock-divider">/</div>
              <div class="stock-info text-right">
                <div class="stock-label">Mínimo Requerido</div>
                <div class="stock-value">{{ alert.minStock }} {{ alert.unit }}</div>
              </div>
            </div>

            <div class="alert-footer">
              <div class="alert-meta">
                <mat-icon>schedule</mat-icon>
                <span>Generada: {{ alert.createdAt | date:'short' }}</span>
                @if (alert.status === 'active' && alert.whatsappSent) {
                  <span class="sent-tag"><mat-icon>done_all</mat-icon> Notificado</span>
                }
              </div>

              <div class="alert-actions" *ngIf="alert.status === 'active'">
                <button class="btn-supplier" (click)="openOrder(alert)">
                  <mat-icon>mail</mat-icon> Pedir al Proveedor
                </button>
                <button class="btn-whatsapp" [class.opacity-50]="alert.whatsappSent && isCritical(alert)" (click)="notifySupplier(alert)">
                  <mat-icon>chat</mat-icon> {{ alert.whatsappSent ? 'Notificar de nuevo' : 'Notificar' }}
                </button>
                <button class="btn-resolve" (click)="resolve(alert.id)">
                  <mat-icon>check</mat-icon> Marcar Resuelto
                </button>
              </div>
              <div class="alert-actions" *ngIf="alert.status === 'resolved'">
                <span class="resolved-text">Resuelto: {{ alert.resolvedAt | date:'short' }}</span>
              </div>
            </div>
          </div>
        }

        @if (filteredAlerts().length === 0) {
          <div class="empty-state">
            <div class="empty-icon-wrap"><mat-icon>thumb_up</mat-icon></div>
            <h3>Todo en orden</h3>
            <p>No hay alertas que coincidan con tu filtro.</p>
          </div>
        }
      </div>
    </div>

    <!-- Modal: Pedir al Proveedor -->
    @if (orderAlert(); as a) {
      <div class="modal-backdrop" (click)="closeOrder()">
        <div class="modal-card animate-fade-in-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><mat-icon>local_shipping</mat-icon> Pedir al Proveedor</h2>
            <button class="modal-close" (click)="closeOrder()"><mat-icon>close</mat-icon></button>
          </div>

          <div class="modal-body">
            <p class="modal-product">Producto: <strong>{{ a.productName }}</strong> · Stock {{ a.currentStock }}/{{ a.minStock }} {{ a.unit }}</p>

            <label class="field-label">Proveedor</label>
            <select class="field-input" [(ngModel)]="selectedSupplierId" (ngModelChange)="onSupplierChange()">
              <option value="" disabled>Selecciona un proveedor</option>
              @for (s of suppliers(); track s.id) {
                <option [value]="s.id">{{ s.name }}{{ s.email ? ' (' + s.email + ')' : ' — sin correo' }}</option>
              }
            </select>

            <div class="field-row">
              <div class="field-col">
                <label class="field-label">Cantidad a pedir</label>
                <input class="field-input" type="number" min="1" [(ngModel)]="orderQuantity" (ngModelChange)="onSupplierChange()" />
              </div>
              <div class="field-col">
                <label class="field-label">Total estimado</label>
                <div class="field-static">{{ orderTotal() | currency }}</div>
              </div>
            </div>

            <label class="field-label">Asunto</label>
            <input class="field-input" [(ngModel)]="emailSubject" />

            <label class="field-label">Mensaje</label>
            <textarea class="field-input" rows="7" [(ngModel)]="emailBody"></textarea>

            @if (!selectedSupplierEmail()) {
              <p class="warn-text"><mat-icon>info</mat-icon> Este proveedor no tiene correo registrado. Agrégalo en Proveedores para enviar el pedido.</p>
            }
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" (click)="closeOrder()">Cancelar</button>
            <button class="btn-send" [disabled]="!selectedSupplierEmail()" (click)="sendOrder()">
              <mat-icon>send</mat-icon> Registrar Pedido y Enviar
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Toast de confirmación -->
    @if (toast(); as t) {
      <div class="toast animate-fade-in-up">
        <mat-icon>check_circle</mat-icon>
        <span>{{ t }}</span>
      </div>
    }
  `,
  styles: [`
    .page-container { max-width: 1000px; margin: 0 auto; padding-bottom: 40px; }

    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 32px; flex-wrap: wrap; gap: 16px;
    }

    .header-text h1 { font-family: var(--pc-font-heading); font-size: 1.8rem; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; }
    .header-text p { color: var(--pc-text-muted); font-size: 0.9rem; }

    /* Pills */
    .filter-pills { display: flex; gap: 8px; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 24px; border: 1px solid var(--pc-border); }
    .pill {
      background: transparent; border: none; color: var(--pc-text-secondary);
      padding: 6px 16px; border-radius: 20px; font-weight: 500; font-size: 0.85rem;
      cursor: pointer; transition: all 0.2s;
    }
    .pill:hover { color: var(--pc-text-primary); }
    .pill.active { background: rgba(255,255,255,0.1); color: var(--pc-text-primary); }
    .pill-danger.active { background: rgba(239, 68, 68, 0.15); color: #F87171; }
    .pill-success.active { background: rgba(16, 185, 129, 0.15); color: #34D399; }

    /* Grid */
    .alerts-grid { display: grid; gap: 16px; }

    /* Card */
    .alert-card {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg);
      position: relative; overflow: hidden; transition: all 0.2s;
    }
    .alert-card:hover { border-color: var(--pc-border-active); transform: translateY(-2px); }

    .resolved-card { opacity: 0.75; }
    .resolved-card:hover { opacity: 1; }

    .alert-indicator { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }

    .alert-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .alert-title { display: flex; align-items: center; gap: 10px; }
    .alert-title h3 { font-size: 1.1rem; font-weight: 600; }
    .alert-title mat-icon { font-size: 22px; width: 22px; height: 22px; }

    .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-active { background: rgba(239, 68, 68, 0.1); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.2); }
    .badge-warning { background: rgba(245, 158, 11, 0.1); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.2); }
    .badge-resolved { background: rgba(16, 185, 129, 0.1); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.2); }

    .alert-body { display: flex; align-items: center; padding: 20px; gap: 24px; background: rgba(0,0,0,0.1); }
    .stock-info { flex: 1; }
    .stock-label { font-size: 0.8rem; color: var(--pc-text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .stock-value { font-size: 1.5rem; font-weight: 700; font-family: var(--pc-font-heading); }
    .stock-divider { font-size: 2rem; color: var(--pc-border); font-weight: 200; }

    .alert-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; flex-wrap: wrap; gap: 12px; }
    .alert-meta { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--pc-text-muted); flex-wrap: wrap; }
    .alert-meta mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .sent-tag { display: inline-flex; align-items: center; gap: 4px; color: #25D366; font-weight: 600; }
    .sent-tag mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .alert-actions { display: flex; gap: 12px; flex-wrap: wrap; }

    .btn-supplier {
      background: rgba(96, 165, 250, 0.1); color: #60A5FA; border: 1px solid rgba(96, 165, 250, 0.3);
      padding: 6px 14px; border-radius: var(--pc-radius-md); font-weight: 600; font-size: 0.85rem;
      cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
    }
    .btn-supplier:hover { background: rgba(96, 165, 250, 0.2); }

    .btn-whatsapp {
      background: rgba(37, 211, 102, 0.1); color: #25D366; border: 1px solid rgba(37, 211, 102, 0.3);
      padding: 6px 14px; border-radius: var(--pc-radius-md); font-weight: 600; font-size: 0.85rem;
      cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
    }
    .btn-whatsapp:hover { background: rgba(37, 211, 102, 0.2); }

    .btn-resolve {
      background: rgba(255,255,255,0.05); color: var(--pc-text-primary); border: 1px solid var(--pc-border);
      padding: 6px 14px; border-radius: var(--pc-radius-md); font-weight: 600; font-size: 0.85rem;
      cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
    }
    .btn-resolve:hover { background: rgba(255,255,255,0.1); color: var(--pc-yellow); border-color: var(--pc-yellow); }

    .resolved-text { font-size: 0.85rem; color: var(--pc-text-muted); font-weight: 500; }

    /* Empty State */
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px 20px; text-align: center; background: rgba(22, 33, 62, 0.4); border-radius: var(--pc-radius-lg); border: 1px dashed var(--pc-border); }
    .empty-icon-wrap { width: 64px; height: 64px; background: rgba(16, 185, 129, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
    .empty-icon-wrap mat-icon { font-size: 32px; width: 32px; height: 32px; color: #10B981; }
    .empty-state h3 { font-size: 1.2rem; margin-bottom: 8px; color: var(--pc-text-primary); }
    .empty-state p { color: var(--pc-text-muted); font-size: 0.9rem; }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(3px);
      display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;
    }
    .modal-card {
      background: var(--pc-surface, #16213e); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg);
      width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid var(--pc-border); }
    .modal-header h2 { font-size: 1.2rem; display: flex; align-items: center; gap: 8px; font-family: var(--pc-font-heading); }
    .modal-close { background: none; border: none; color: var(--pc-text-muted); cursor: pointer; display: flex; }
    .modal-close:hover { color: var(--pc-text-primary); }
    .modal-body { padding: 22px; display: flex; flex-direction: column; gap: 6px; }
    .modal-product { color: var(--pc-text-secondary); font-size: 0.9rem; margin-bottom: 8px; }
    .field-label { font-size: 0.8rem; color: var(--pc-text-muted); margin-top: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    .field-input {
      width: 100%; background: rgba(0,0,0,0.25); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-md);
      color: var(--pc-text-primary); padding: 10px 12px; font-size: 0.9rem; font-family: inherit; resize: vertical;
    }
    .field-input:focus { outline: none; border-color: var(--pc-border-active, #60A5FA); }
    .field-row { display: flex; gap: 14px; }
    .field-col { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .field-static { background: rgba(0,0,0,0.15); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-md); color: var(--pc-yellow); padding: 10px 12px; font-weight: 700; }
    .warn-text { display: flex; align-items: center; gap: 6px; color: #FBBF24; font-size: 0.82rem; margin-top: 10px; }
    .warn-text mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 18px 22px; border-top: 1px solid var(--pc-border); }
    .btn-cancel {
      background: rgba(255,255,255,0.05); color: var(--pc-text-primary); border: 1px solid var(--pc-border);
      padding: 8px 18px; border-radius: var(--pc-radius-md); font-weight: 600; cursor: pointer;
    }
    .btn-cancel:hover { background: rgba(255,255,255,0.1); }
    .btn-send {
      background: #2563EB; color: #fff; border: none; padding: 8px 18px; border-radius: var(--pc-radius-md);
      font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;
    }
    .btn-send:hover { background: #1D4ED8; }
    .btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Toast */
    .toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: #065F46; color: #ECFDF5; border: 1px solid #10B981;
      padding: 12px 18px; border-radius: var(--pc-radius-md); box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      display: flex; align-items: center; gap: 8px; font-weight: 600; z-index: 1100; max-width: 90vw;
    }
    .toast mat-icon { font-size: 20px; width: 20px; height: 20px; color: #34D399; }

    /* Utilities */
    .text-red { color: #EF4444 !important; }
    .text-yellow { color: #FBBF24 !important; }
    .text-green { color: #10B981 !important; }
    .bg-red { background: #EF4444; }
    .bg-yellow { background: #F59E0B; }
    .bg-green { background: #10B981; }
    .text-right { text-align: right; }
    .opacity-50 { opacity: 0.5; }

    @media (max-width: 600px) {
      .alert-header { flex-direction: column; align-items: flex-start; gap: 12px; }
      .alert-body { flex-direction: column; gap: 12px; align-items: flex-start; }
      .stock-divider { display: none; }
      .stock-info.text-right { text-align: left; }
      .alert-footer { flex-direction: column; align-items: flex-start; gap: 16px; }
    }
  `]
})
export class AlertsComponent {
  filter = signal<'all' | 'active' | 'resolved'>('active');

  // Estado del modal "Pedir al Proveedor"
  orderAlert = signal<StockAlert | null>(null);
  selectedSupplierId = '';
  orderQuantity = 1;
  emailSubject = '';
  emailBody = '';

  // Mensaje de confirmación temporal (toast).
  toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(public dataService: DataService) {}

  suppliers = computed(() => this.dataService.suppliers().filter(s => s.active !== false));

  filteredAlerts = computed(() => {
    const alerts = this.dataService.alerts();
    const currentFilter = this.filter();

    let filtered = alerts;
    if (currentFilter === 'active') {
      filtered = alerts.filter(a => a.status === 'active');
    } else if (currentFilter === 'resolved') {
      filtered = alerts.filter(a => a.status === 'resolved');
    }

    // Orden: Críticas primero, luego stock bajo, luego resueltas; dentro por fecha desc.
    return filtered.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      if (a.status === 'active') {
        const sev = (this.isCritical(b) ? 1 : 0) - (this.isCritical(a) ? 1 : 0);
        if (sev !== 0) return sev;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  activeCount = computed(() => this.dataService.activeAlerts().length);

  /** Severidad derivada: crítica si el stock ya llegó (o bajó) del mínimo. */
  isCritical(alert: StockAlert): boolean {
    return alert.currentStock <= alert.minStock;
  }

  resolve(id: string) {
    this.dataService.resolveAlert(id);
  }

  // ---- Modal de pedido al proveedor ----
  openOrder(alert: StockAlert) {
    this.orderAlert.set(alert);
    // Pre-selecciona el proveedor del producto si está registrado.
    const product = this.dataService.getProduct(alert.productId);
    const match = this.suppliers().find(s => s.id === product?.supplierId);
    this.selectedSupplierId = match?.id ?? (this.suppliers()[0]?.id ?? '');
    // Cantidad sugerida: lo necesario para llegar al doble del mínimo.
    this.orderQuantity = Math.max(1, Math.ceil(alert.minStock * 2 - alert.currentStock));
    this.composeEmail(alert);
  }

  closeOrder() {
    this.orderAlert.set(null);
  }

  onSupplierChange() {
    const alert = this.orderAlert();
    if (alert) this.composeEmail(alert);
  }

  selectedSupplierEmail = () => this.findSupplier()?.email?.trim() || '';

  /** Precio unitario del producto asociado a la alerta. */
  private unitPrice(): number {
    const alert = this.orderAlert();
    return alert ? (this.dataService.getProduct(alert.productId)?.currentPrice ?? 0) : 0;
  }

  orderTotal = () => (this.orderQuantity || 0) * this.unitPrice();

  private findSupplier(): Supplier | undefined {
    return this.suppliers().find(s => s.id === this.selectedSupplierId);
  }

  private composeEmail(alert: StockAlert) {
    const supplier = this.findSupplier();
    const contact = supplier?.contactName || supplier?.name || 'proveedor';
    this.emailSubject = `Pedido de reabastecimiento - ${alert.productName}`;
    this.emailBody =
      `Estimado/a ${contact},\n\n` +
      `Le escribimos desde Pollo Centro para solicitar el reabastecimiento del siguiente producto:\n\n` +
      `• Producto: ${alert.productName}\n` +
      `• Cantidad solicitada: ${this.orderQuantity} ${alert.unit}\n` +
      `• Stock actual: ${alert.currentStock} ${alert.unit}\n` +
      `• Stock mínimo requerido: ${alert.minStock} ${alert.unit}\n\n` +
      `Agradecemos confirmar disponibilidad y tiempo de entrega.\n\n` +
      `Saludos cordiales,\nPollo Centro`;
  }

  sendOrder() {
    const alert = this.orderAlert();
    const supplier = this.findSupplier();
    if (!alert || !supplier || !this.selectedSupplierEmail()) return;

    // Registra el pedido en el módulo de Órdenes (estado pendiente).
    const quantity = this.orderQuantity || 1;
    const price = this.unitPrice();
    this.dataService.addOrderReception({
      supplierId: supplier.id,
      supplierName: supplier.name,
      productId: alert.productId,
      productName: alert.productName,
      quantity,
      price,
      total: quantity * price,
      status: 'pending',
      receivedBy: 'Alertas',
    });

    // Marca la alerta como notificada.
    this.dataService.markAlertWhatsappSent(alert.id);

    // Envía el correo al proveedor.
    this.dataService.emailSupplier(supplier, this.emailSubject, this.emailBody);
    this.closeOrder();
    this.showToast(`Pedido registrado y correo enviado a ${supplier.name}`);
  }

  notifySupplier(alert: StockAlert) {
    this.dataService.notifyViaWhatsApp(alert);
    this.showToast('Notificación de WhatsApp enviada');
  }

  private showToast(message: string) {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }
}
