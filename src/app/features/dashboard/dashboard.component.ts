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
      <!-- Hero Header -->
      <div class="hero-header animate-fade-in-up">
        <div class="hero-text">
          <h1>{{ greeting() }}, {{ auth.userName() }} 👋</h1>
          <p>¿Cómo va tu inventario?</p>
        </div>
        <div class="hero-decoration">
          <div class="hero-circle c1"></div>
          <div class="hero-circle c2"></div>
          <div class="hero-circle c3"></div>
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

      <!-- Category Tabs Section -->
      <div class="category-section animate-fade-in-up">
        <div class="category-tabs">
          <div class="cat-tab cat-inventario" [class.active]="activeTab === 'inventario'" (click)="activeTab = 'inventario'">
            <mat-icon>inventory_2</mat-icon>
            <span>Inventario</span>
            <button class="cat-tab-action" routerLink="/inventory" (click)="$event.stopPropagation()">
              <mat-icon>add</mat-icon>
            </button>
          </div>
          <div class="cat-tab cat-recetas" [class.active]="activeTab === 'recetas'" (click)="activeTab = 'recetas'">
            <mat-icon>restaurant</mat-icon>
            <span>Recetas</span>
            <button class="cat-tab-action" routerLink="/recipes" (click)="$event.stopPropagation()">
              <mat-icon>add</mat-icon>
            </button>
          </div>
          <div class="cat-tab cat-precios" [class.active]="activeTab === 'precios'" (click)="activeTab = 'precios'">
            <mat-icon>attach_money</mat-icon>
            <span>Precios</span>
            <button class="cat-tab-action" routerLink="/prices" (click)="$event.stopPropagation()">
              <mat-icon>add</mat-icon>
            </button>
          </div>
        </div>
        <div class="category-content">
          @if (activeTab === 'inventario') {
            <div class="cat-links">
              <a routerLink="/inventory" class="cat-link" id="link-products">
                <span>Productos</span><mat-icon>chevron_right</mat-icon>
              </a>
              <a routerLink="/inventory" class="cat-link" id="link-reorder">
                <span>Stock bajo</span><mat-icon>chevron_right</mat-icon>
              </a>
              <a routerLink="/inventory" class="cat-link" id="link-current-stock">
                <span>Stock actual</span><mat-icon>chevron_right</mat-icon>
              </a>
            </div>
            <div class="cat-illustration">
              <div class="illus-boxes">
                <div class="illus-box b1">📦</div>
                <div class="illus-box b2">🍗</div>
                <div class="illus-box b3">🧂</div>
              </div>
            </div>
          }
          @if (activeTab === 'recetas') {
            <div class="cat-links">
              <a routerLink="/recipes" class="cat-link" id="link-recipes">
                <span>Ver recetas</span><mat-icon>chevron_right</mat-icon>
              </a>
              <a routerLink="/recipes" class="cat-link" id="link-prepare">
                <span>Preparar receta</span><mat-icon>chevron_right</mat-icon>
              </a>
              <a routerLink="/recipes" class="cat-link" id="link-history">
                <span>Historial</span><mat-icon>chevron_right</mat-icon>
              </a>
            </div>
            <div class="cat-illustration">
              <div class="illus-boxes">
                <div class="illus-box b1">🍳</div>
                <div class="illus-box b2">🍗</div>
                <div class="illus-box b3">🔥</div>
              </div>
            </div>
          }
          @if (activeTab === 'precios') {
            <div class="cat-links">
              <a routerLink="/prices" class="cat-link" id="link-price-register">
                <span>Registro de precios</span><mat-icon>chevron_right</mat-icon>
              </a>
              <a routerLink="/prices" class="cat-link" id="link-price-history">
                <span>Historial</span><mat-icon>chevron_right</mat-icon>
              </a>
              <a routerLink="/reports" class="cat-link" id="link-trends">
                <span>Tendencias</span><mat-icon>chevron_right</mat-icon>
              </a>
            </div>
            <div class="cat-illustration">
              <div class="illus-boxes">
                <div class="illus-box b1">📈</div>
                <div class="illus-box b2">💰</div>
                <div class="illus-box b3">📊</div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Reports Section -->
      <div class="reports-section animate-fade-in-up">
        <div class="reports-header">
          <mat-icon>assessment</mat-icon>
          <span>Reportes</span>
        </div>
        <div class="reports-content">
          <div class="reports-links">
            <a routerLink="/reports" class="report-link" id="link-recent-reports">
              <span>Generados recientemente</span><mat-icon>chevron_right</mat-icon>
            </a>
            <a routerLink="/reports" class="report-link" id="link-stock-levels">
              <span>Niveles de stock</span><mat-icon>chevron_right</mat-icon>
            </a>
            <a routerLink="/reports" class="report-link" id="link-price-reports">
              <span>Historial de precios</span><mat-icon>chevron_right</mat-icon>
            </a>
            <a routerLink="/reports" class="report-link" id="link-preps-report">
              <span>Preparaciones</span><mat-icon>chevron_right</mat-icon>
            </a>
            <a routerLink="/reports" class="report-link" id="link-audit-report">
              <span>Auditoría</span><mat-icon>chevron_right</mat-icon>
            </a>
          </div>
          <div class="reports-illustration">
            <div class="report-chart-illus">
              <div class="chart-bar bar1"></div>
              <div class="chart-bar bar2"></div>
              <div class="chart-bar bar3"></div>
              <div class="chart-bar bar4"></div>
              <div class="chart-bar bar5"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Grid -->
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

        <!-- Quick Actions -->
        <div class="dashboard-card animate-fade-in-up" id="quick-actions-panel">
          <div class="card-header">
            <h3><mat-icon class="text-yellow">flash_on</mat-icon> Acciones Rápidas</h3>
          </div>
          <div class="card-body quick-actions-body">
            <a routerLink="/inventory" class="quick-action" id="qa-new-product">
              <mat-icon>add_circle</mat-icon>
              <span>Nuevo Producto</span>
            </a>
            <a routerLink="/recipes" class="quick-action" id="qa-prepare">
              <mat-icon>restaurant</mat-icon>
              <span>Preparar Receta</span>
            </a>
            <a routerLink="/prices" class="quick-action" id="qa-price">
              <mat-icon>trending_up</mat-icon>
              <span>Registrar Precio</span>
            </a>
            <a routerLink="/reports" class="quick-action" id="qa-reports">
              <mat-icon>assessment</mat-icon>
              <span>Ver Reportes</span>
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

    /* --- Hero Header --- */
    .hero-header {
      position: relative;
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.9), rgba(26, 26, 46, 0.7));
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-xl);
      padding: 32px 36px;
      margin-bottom: 28px;
      overflow: hidden;
    }

    .hero-text h1 {
      font-family: var(--pc-font-heading);
      font-size: 1.9rem;
      margin-bottom: 6px;
      position: relative;
      z-index: 1;
    }

    .hero-text p {
      color: var(--pc-text-muted);
      font-size: 1rem;
      position: relative;
      z-index: 1;
    }

    .hero-decoration {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 300px;
      pointer-events: none;
    }

    .hero-circle {
      position: absolute;
      border-radius: 50%;
      opacity: 0.06;
    }

    .hero-circle.c1 {
      width: 200px;
      height: 200px;
      background: var(--pc-yellow);
      right: -40px;
      top: -40px;
    }

    .hero-circle.c2 {
      width: 120px;
      height: 120px;
      background: var(--pc-yellow);
      right: 100px;
      bottom: -20px;
    }

    .hero-circle.c3 {
      width: 80px;
      height: 80px;
      background: var(--pc-red);
      right: 60px;
      top: 10px;
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

    /* --- Category Section --- */
    .category-section {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      overflow: hidden;
      margin-bottom: 20px;
    }

    .category-tabs {
      display: flex;
    }

    .cat-tab {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 24px;
      cursor: pointer;
      transition: all var(--pc-transition-normal);
      position: relative;
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--pc-text-secondary);
      border-bottom: 3px solid transparent;
    }

    .cat-tab:not(:last-child) {
      border-right: 1px solid var(--pc-border);
    }

    .cat-tab mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .cat-tab-action {
      margin-left: auto;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.06);
      color: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all var(--pc-transition-fast);
    }

    .cat-tab-action mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .cat-tab-action:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: scale(1.1);
    }

    /* Inventario Tab */
    .cat-inventario.active {
      background: linear-gradient(135deg, rgba(242, 201, 76, 0.12), rgba(201, 162, 39, 0.06));
      color: var(--pc-yellow);
      border-bottom-color: var(--pc-yellow);
    }

    .cat-inventario:hover:not(.active) { background: rgba(242, 201, 76, 0.04); }

    /* Recetas Tab */
    .cat-recetas.active {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.06));
      color: #10B981;
      border-bottom-color: #10B981;
    }

    .cat-recetas:hover:not(.active) { background: rgba(16, 185, 129, 0.04); }

    /* Precios Tab */
    .cat-precios.active {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.06));
      color: #3B82F6;
      border-bottom-color: #3B82F6;
    }

    .cat-precios:hover:not(.active) { background: rgba(59, 130, 246, 0.04); }

    .category-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      min-height: 160px;
    }

    .cat-links {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .cat-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-radius: var(--pc-radius-sm);
      color: var(--pc-text-secondary);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all var(--pc-transition-fast);
      max-width: 300px;
    }

    .cat-link:hover {
      background: rgba(255, 255, 255, 0.04);
      color: var(--pc-text-primary);
      padding-left: 20px;
    }

    .cat-link mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      opacity: 0.5;
      transition: opacity var(--pc-transition-fast);
    }

    .cat-link:hover mat-icon { opacity: 1; }

    /* Illustration */
    .cat-illustration {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 24px;
    }

    .illus-boxes {
      display: flex;
      gap: 8px;
      transform: perspective(400px) rotateY(-8deg);
    }

    .illus-box {
      width: 64px;
      height: 64px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      animation: float 3s ease-in-out infinite;
    }

    .illus-box.b1 { animation-delay: 0s; }
    .illus-box.b2 { animation-delay: 0.4s; }
    .illus-box.b3 { animation-delay: 0.8s; }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    /* --- Reports Section --- */
    .reports-section {
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      overflow: hidden;
      margin-bottom: 20px;
    }

    .reports-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 24px;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(91, 33, 182, 0.15));
      font-size: 1.05rem;
      font-weight: 700;
      font-family: var(--pc-font-heading);
      color: #E0D4FC;
    }

    .reports-header mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      color: #C4B5FD;
    }

    .reports-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(91, 33, 182, 0.04));
    }

    .reports-links {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px 24px;
      flex: 1;
    }

    .report-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: var(--pc-radius-sm);
      color: var(--pc-text-secondary);
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 500;
      transition: all var(--pc-transition-fast);
    }

    .report-link:hover {
      background: rgba(124, 58, 237, 0.1);
      color: #C4B5FD;
      padding-left: 16px;
    }

    .report-link mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      opacity: 0.4;
    }

    .report-link:hover mat-icon { opacity: 1; }

    /* Chart Illustration */
    .reports-illustration {
      padding: 0 24px;
    }

    .report-chart-illus {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 80px;
    }

    .chart-bar {
      width: 16px;
      border-radius: 4px 4px 0 0;
      animation: growBar 1s ease-out forwards;
      opacity: 0;
    }

    .bar1 { background: rgba(196, 181, 253, 0.3); height: 40%; animation-delay: 0.1s; }
    .bar2 { background: rgba(196, 181, 253, 0.4); height: 65%; animation-delay: 0.2s; }
    .bar3 { background: rgba(196, 181, 253, 0.5); height: 45%; animation-delay: 0.3s; }
    .bar4 { background: rgba(196, 181, 253, 0.6); height: 80%; animation-delay: 0.4s; }
    .bar5 { background: rgba(196, 181, 253, 0.7); height: 55%; animation-delay: 0.5s; }

    @keyframes growBar {
      from {
        opacity: 0;
        transform: scaleY(0);
        transform-origin: bottom;
      }
      to {
        opacity: 1;
        transform: scaleY(1);
        transform-origin: bottom;
      }
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

      .category-tabs {
        flex-direction: column;
      }

      .cat-tab:not(:last-child) {
        border-right: none;
        border-bottom: 1px solid var(--pc-border);
      }

      .category-content {
        flex-direction: column;
        gap: 16px;
      }

      .cat-illustration { display: none; }

      .reports-content {
        flex-direction: column;
      }

      .reports-links {
        grid-template-columns: 1fr 1fr;
      }

      .reports-illustration { display: none; }
    }

    @media (max-width: 480px) {
      .kpi-grid {
        grid-template-columns: 1fr;
      }

      .reports-links {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class DashboardComponent {
  activeTab = 'inventario';

  constructor(
    public auth: AuthService,
    private dataService: DataService
  ) {}

  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  });

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

  getStockPercent(product: { currentStock: number; minStock: number }): number {
    return Math.min(100, (product.currentStock / Math.max(product.minStock, 1)) * 100);
  }
}
