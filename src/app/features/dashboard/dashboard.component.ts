import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  template: `
    <div class="dashboard">
      <div class="page-header animate-fade-in-up">
        <div>
          <h1>Dashboard</h1>
          <p>Bienvenido, {{ auth.userName() }} 👋</p>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid stagger-children">
        <div class="kpi-card animate-fade-in-up" id="kpi-total-products">
          <div class="kpi-icon-wrap kpi-blue">
            <mat-icon>inventory_2</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-value">{{ totalProducts() }}</span>
            <span class="kpi-label">Productos</span>
          </div>
        </div>

        <div class="kpi-card animate-fade-in-up" id="kpi-recipes">
          <div class="kpi-icon-wrap kpi-green">
            <mat-icon>restaurant</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-value">{{ totalRecipes() }}</span>
            <span class="kpi-label">Recetas</span>
          </div>
        </div>

        <div class="kpi-card animate-fade-in-up" id="kpi-alerts">
          <div class="kpi-icon-wrap kpi-red">
            <mat-icon>warning</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-value">{{ activeAlerts() }}</span>
            <span class="kpi-label">Alertas Activas</span>
          </div>
        </div>

        <div class="kpi-card animate-fade-in-up" id="kpi-prepared-today">
          <div class="kpi-icon-wrap kpi-yellow">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-value">{{ preparedToday() }}</span>
            <span class="kpi-label">Preparadas Hoy</span>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- Low Stock Products -->
        <div class="dashboard-card animate-fade-in-up" id="low-stock-panel">
          <div class="card-header">
            <h3><mat-icon class="text-red">warning</mat-icon> Stock Bajo</h3>
            <a routerLink="/inventory" class="card-link">Ver todo →</a>
          </div>
          <div class="card-body">
            @if (lowStockProducts().length === 0) {
              <div class="empty-state">
                <mat-icon class="text-green">check_circle</mat-icon>
                <p>Todo el inventario está en orden</p>
              </div>
            } @else {
              @for (product of lowStockProducts(); track product.id) {
                <div class="stock-item">
                  <div class="stock-item-info">
                    <span class="stock-item-name">{{ product.name }}</span>
                    <span class="stock-item-cat">{{ product.category }}</span>
                  </div>
                  <div class="stock-item-levels">
                    <div class="stock-bar-bg">
                      <div class="stock-bar"
                           [style.width.%]="getStockPercent(product)"
                           [class.stock-critical]="product.currentStock <= product.minStock * 0.5"
                           [class.stock-warning]="product.currentStock > product.minStock * 0.5">
                      </div>
                    </div>
                    <span class="stock-numbers"
                          [class.text-red]="product.currentStock <= product.minStock * 0.5"
                          [class.text-orange]="product.currentStock > product.minStock * 0.5">
                      {{ product.currentStock }} / {{ product.minStock }} {{ product.unit }}
                    </span>
                  </div>
                </div>
              }
            }
          </div>
        </div>

        <!-- Recent Preparations -->
        <div class="dashboard-card animate-fade-in-up" id="recent-preps-panel">
          <div class="card-header">
            <h3><mat-icon class="text-yellow">restaurant</mat-icon> Preparaciones Recientes</h3>
            <a routerLink="/recipes" class="card-link">Ver todo →</a>
          </div>
          <div class="card-body">
            @if (recentLogs().length === 0) {
              <div class="empty-state">
                <mat-icon class="text-muted">restaurant</mat-icon>
                <p>No hay preparaciones recientes</p>
              </div>
            } @else {
              @for (log of recentLogs(); track log.id) {
                <div class="prep-item">
                  <div class="prep-icon">🍗</div>
                  <div class="prep-info">
                    <span class="prep-name">{{ log.recipeName }}</span>
                    <span class="prep-details">
                      {{ log.preparedBy }} · {{ formatDate(log.preparedAt) }}
                    </span>
                  </div>
                  <div class="prep-qty">x{{ log.quantity }}</div>
                </div>
              }
            }
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="dashboard-card animate-fade-in-up" id="quick-actions-panel">
          <div class="card-header">
            <h3><mat-icon class="text-yellow">flash_on</mat-icon> Acciones Rápidas</h3>
          </div>
          <div class="card-body quick-actions-body">
            <a routerLink="/inventory" class="quick-action">
              <mat-icon>add_circle</mat-icon>
              <span>Nuevo Producto</span>
            </a>
            <a routerLink="/recipes" class="quick-action">
              <mat-icon>restaurant</mat-icon>
              <span>Preparar Receta</span>
            </a>
            <a routerLink="/prices" class="quick-action">
              <mat-icon>trending_up</mat-icon>
              <span>Registrar Precio</span>
            </a>
            <a routerLink="/alerts" class="quick-action">
              <mat-icon>notifications</mat-icon>
              <span>Ver Alertas</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 28px;
    }

    .page-header h1 {
      font-family: var(--pc-font-heading);
      font-size: 1.8rem;
      margin-bottom: 4px;
    }

    .page-header p {
      color: var(--pc-text-muted);
      font-size: 0.95rem;
    }

    /* --- KPI Grid --- */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .kpi-card {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.8), rgba(26, 26, 46, 0.6));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all var(--pc-transition-normal);
      cursor: default;
    }

    .kpi-card:hover {
      border-color: var(--pc-border-active);
      box-shadow: var(--pc-shadow-glow);
      transform: translateY(-2px);
    }

    .kpi-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: var(--pc-radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .kpi-icon-wrap mat-icon {
      color: white;
      font-size: 24px;
    }

    .kpi-blue { background: linear-gradient(135deg, #3B82F6, #2563EB); }
    .kpi-green { background: linear-gradient(135deg, #43A047, #2E7D32); }
    .kpi-red { background: linear-gradient(135deg, #E53935, #C62828); }
    .kpi-yellow { background: linear-gradient(135deg, #F2C94C, #C9A227); }

    .kpi-info {
      display: flex;
      flex-direction: column;
    }

    .kpi-value {
      font-family: var(--pc-font-heading);
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--pc-text-primary);
      line-height: 1;
    }

    .kpi-label {
      font-size: 0.8rem;
      color: var(--pc-text-muted);
      margin-top: 4px;
    }

    /* --- Dashboard Grid --- */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .dashboard-card {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      overflow: hidden;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--pc-border);
    }

    .card-header h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      font-family: var(--pc-font-heading);
    }

    .card-header h3 mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .card-link {
      color: var(--pc-yellow);
      text-decoration: none;
      font-size: 0.8rem;
      font-weight: 500;
      transition: opacity var(--pc-transition-fast);
    }

    .card-link:hover {
      opacity: 0.8;
    }

    .card-body {
      padding: 16px 20px;
      max-height: 320px;
      overflow-y: auto;
    }

    /* --- Stock Items --- */
    .stock-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid var(--pc-border);
    }

    .stock-item:last-child {
      border-bottom: none;
    }

    .stock-item-info {
      display: flex;
      flex-direction: column;
      min-width: 120px;
    }

    .stock-item-name {
      font-weight: 600;
      font-size: 0.88rem;
    }

    .stock-item-cat {
      font-size: 0.72rem;
      color: var(--pc-text-muted);
      text-transform: uppercase;
    }

    .stock-item-levels {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      flex: 1;
      max-width: 200px;
      margin-left: 16px;
    }

    .stock-bar-bg {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;
    }

    .stock-bar {
      height: 100%;
      border-radius: 3px;
      transition: width 0.5s ease;
    }

    .stock-critical { background: var(--pc-red); }
    .stock-warning { background: var(--pc-orange); }

    .stock-numbers {
      font-size: 0.75rem;
      font-weight: 600;
    }

    /* --- Prep Items --- */
    .prep-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--pc-border);
    }

    .prep-item:last-child {
      border-bottom: none;
    }

    .prep-icon {
      font-size: 24px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(242, 201, 76, 0.1);
      border-radius: var(--pc-radius-sm);
      flex-shrink: 0;
    }

    .prep-info {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .prep-name {
      font-weight: 600;
      font-size: 0.88rem;
    }

    .prep-details {
      font-size: 0.75rem;
      color: var(--pc-text-muted);
    }

    .prep-qty {
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--pc-yellow);
      padding: 4px 10px;
      background: rgba(242, 201, 76, 0.1);
      border-radius: var(--pc-radius-sm);
    }

    /* --- Quick Actions --- */
    .quick-actions-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .quick-action {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px;
      border-radius: var(--pc-radius-md);
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--pc-border);
      text-decoration: none;
      color: var(--pc-text-secondary);
      transition: all var(--pc-transition-normal);
      cursor: pointer;
    }

    .quick-action:hover {
      background: rgba(242, 201, 76, 0.06);
      border-color: var(--pc-border-active);
      color: var(--pc-yellow);
      transform: translateY(-2px);
    }

    .quick-action mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .quick-action span {
      font-size: 0.82rem;
      font-weight: 500;
      text-align: center;
    }

    /* --- Empty State --- */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px;
      gap: 8px;
    }

    .empty-state mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      opacity: 0.5;
    }

    .empty-state p {
      color: var(--pc-text-muted);
      font-size: 0.88rem;
    }

    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }

      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 480px) {
      .kpi-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class DashboardComponent {
  constructor(
    public auth: AuthService,
    private dataService: DataService
  ) {}

  totalProducts = computed(() => this.dataService.totalProducts());
  totalRecipes = computed(() => this.dataService.recipes().length);
  activeAlerts = computed(() => this.dataService.activeAlerts().length);

  preparedToday = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.dataService.recipeLogs().filter(l => {
      const d = new Date(l.preparedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;
  });

  lowStockProducts = computed(() => this.dataService.lowStockProducts().slice(0, 6));

  recentLogs = computed(() => this.dataService.recipeLogs().slice(0, 5));

  getStockPercent(product: { currentStock: number; minStock: number }): number {
    return Math.min(100, (product.currentStock / Math.max(product.minStock, 1)) * 100);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('es', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
