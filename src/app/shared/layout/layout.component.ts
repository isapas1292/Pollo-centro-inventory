import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  permission: string;
  children?: NavItem[];
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatBadgeModule,
    MatMenuModule,
  ],
  template: `
    @if (dataService.loading()) { <div class="global-loading-bar"></div> }
    <div class="layout" [class.sidebar-collapsed]="sidebarCollapsed()">
      <!-- Sidebar -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed()">
        <div class="sidebar-header">
          <div class="sidebar-logo" (click)="sidebarCollapsed.set(!sidebarCollapsed())">
            <div class="logo-badge">🐔</div>
            @if (!sidebarCollapsed()) {
              <div class="logo-text">
                <span class="logo-pollo">Pollo</span>
                <span class="logo-centro">CENTRO</span>
              </div>
            }
          </div>
        </div>

        <nav class="sidebar-nav">
          @for (item of visibleNavItems(); track item.route) {
            @if (item.children) {
              <div class="nav-group" [class.expanded]="isExpanded(item.route)">
                <a class="nav-item has-children"
                   (click)="toggleExpand(item.route)"
                   [class.active]="isChildActive(item.route)"
                   [matTooltip]="sidebarCollapsed() ? item.label : ''"
                   matTooltipPosition="right">
                  <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
                  @if (!sidebarCollapsed()) {
                    <span class="nav-label">{{ item.label }}</span>
                    <mat-icon class="expand-icon">{{ isExpanded(item.route) ? 'expand_less' : 'expand_more' }}</mat-icon>
                  }
                </a>
                @if (isExpanded(item.route) && !sidebarCollapsed()) {
                  <div class="nav-children">
                    @for (child of item.children; track child.route) {
                      <a class="nav-item child-item"
                         [routerLink]="child.route"
                         routerLinkActive="active">
                        <mat-icon class="nav-icon child-icon">{{ child.icon }}</mat-icon>
                        <span class="nav-label">{{ child.label }}</span>
                      </a>
                    }
                  </div>
                }
              </div>
            } @else {
              <a class="nav-item"
                 [routerLink]="item.route"
                 routerLinkActive="active"
                 [matTooltip]="sidebarCollapsed() ? item.label : ''"
                 matTooltipPosition="right"
                 [id]="'nav-' + item.route.replace('/', '')">
                <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
                @if (!sidebarCollapsed()) {
                  <span class="nav-label">{{ item.label }}</span>
                }
                @if (item.route === '/alerts' && activeAlertCount() > 0) {
                  <span class="nav-badge" [class.collapsed-badge]="sidebarCollapsed()">
                    {{ activeAlertCount() }}
                  </span>
                }
              </a>
            }
          }
        </nav>

        <div class="sidebar-footer">
          <button class="nav-item logout-btn" (click)="auth.logout()" id="btn-logout"
                  [matTooltip]="sidebarCollapsed() ? 'Cerrar Sesión' : ''"
                  matTooltipPosition="right">
            <mat-icon class="nav-icon">logout</mat-icon>
            @if (!sidebarCollapsed()) {
              <span class="nav-label">Cerrar Sesión</span>
            }
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <div class="main-wrapper">
        <!-- Header -->
        <header class="header">
          <div class="header-left">
            <button mat-icon-button class="mobile-menu-btn" (click)="sidebarCollapsed.set(!sidebarCollapsed())">
              <mat-icon>menu</mat-icon>
            </button>
          </div>

          <div class="header-right">
            <!-- Alert indicator -->
            @if (activeAlertCount() > 0) {
              <button mat-icon-button
                      class="header-alert-btn"
                      routerLink="/alerts"
                      [matBadge]="activeAlertCount()"
                      matBadgeColor="warn"
                      matBadgeSize="small">
                <mat-icon>notifications</mat-icon>
              </button>
            }

            <!-- User menu -->
            <button class="user-chip" [matMenuTriggerFor]="userMenu" id="user-menu-trigger">
              <div class="user-avatar">
                {{ auth.userName().charAt(0).toUpperCase() }}
              </div>
              <div class="user-info">
                <span class="user-name">{{ auth.userName() }}</span>
                <span class="user-role">{{ getRoleLabel(auth.userRole()) }}</span>
              </div>
              <mat-icon class="user-chevron">expand_more</mat-icon>
            </button>

            <mat-menu #userMenu="matMenu">
              <button mat-menu-item disabled>
                <mat-icon>person</mat-icon>
                <span>{{ auth.user()?.email }}</span>
              </button>
              <button mat-menu-item (click)="auth.logout()">
                <mat-icon>logout</mat-icon>
                <span>Cerrar Sesión</span>
              </button>
            </mat-menu>
          </div>
        </header>

        <!-- Page content -->
        <main class="main-content">
          <router-outlet />
        </main>
      </div>
    </div>

    <!-- Mobile overlay -->
    @if (!sidebarCollapsed()) {
      <div class="mobile-overlay" (click)="sidebarCollapsed.set(true)"></div>
    }

    <!-- Notificaciones globales (toasts) -->
    <div class="toast-stack">
      @for (t of notify.toasts(); track t.id) {
        <div class="toast" [class.t-success]="t.type === 'success'" [class.t-error]="t.type === 'error'" [class.t-info]="t.type === 'info'">
          <mat-icon>{{ t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info' }}</mat-icon>
          <span>{{ t.message }}</span>
          <button class="toast-close" (click)="notify.dismiss(t.id)"><mat-icon>close</mat-icon></button>
        </div>
      }
    </div>

    <!-- Diálogo de confirmación global -->
    @if (confirm.state(); as c) {
      <div class="confirm-backdrop" (click)="confirm.resolve(false)">
        <div class="confirm-card" (click)="$event.stopPropagation()">
          <div class="confirm-icon" [class.danger]="c.danger">
            <mat-icon>{{ c.danger ? 'warning' : 'help' }}</mat-icon>
          </div>
          <h3>{{ c.title }}</h3>
          <p>{{ c.message }}</p>
          <div class="confirm-actions">
            <button class="cf-cancel" (click)="confirm.resolve(false)">{{ c.cancelText }}</button>
            <button class="cf-ok" [class.danger]="c.danger" (click)="confirm.resolve(true)">{{ c.confirmText }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* --- Sidebar --- */
    .sidebar {
      width: var(--pc-sidebar-width);
      min-width: var(--pc-sidebar-width);
      height: 100vh;
      background: var(--pc-bg-sidebar);
      border-right: 1px solid var(--pc-border);
      display: flex;
      flex-direction: column;
      transition: all var(--pc-transition-normal);
      z-index: 100;
    }

    .sidebar.collapsed {
      width: var(--pc-sidebar-collapsed);
      min-width: var(--pc-sidebar-collapsed);
    }

    .sidebar-header {
      padding: 20px 16px;
      border-bottom: 1px solid var(--pc-border);
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      padding: 4px;
      border-radius: var(--pc-radius-sm);
      transition: background var(--pc-transition-fast);
    }

    .sidebar-logo:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .logo-badge {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--pc-yellow), var(--pc-yellow-dark));
      border-radius: var(--pc-radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
      font-family: var(--pc-font-heading);
      font-weight: 800;
    }

    .logo-pollo {
      font-size: 0.85rem;
      color: var(--pc-yellow);
    }

    .logo-centro {
      font-size: 1.05rem;
      color: var(--pc-red);
      letter-spacing: 0.08em;
    }

    /* --- Navigation --- */
    .sidebar-nav {
      flex: 1;
      padding: 12px 8px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: var(--pc-radius-sm);
      color: var(--pc-text-secondary);
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--pc-transition-fast);
      position: relative;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-family: var(--pc-font-body);
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--pc-text-primary);
    }

    .nav-item.active {
      background: rgba(242, 201, 76, 0.1);
      color: var(--pc-yellow);
    }

    .nav-item.active .nav-icon {
      color: var(--pc-yellow);
    }

    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: var(--pc-yellow);
      border-radius: 0 4px 4px 0;
    }

    .nav-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: var(--pc-text-muted);
      transition: color var(--pc-transition-fast);
    }

    .nav-children {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 2px;
      margin-left: 20px;
      padding-left: 10px;
      border-left: 1px dashed rgba(255, 255, 255, 0.15);
    }

    .child-item {
      color: rgba(255, 255, 255, 0.45) !important;
      font-size: 0.82rem;
      padding: 8px 12px;
      font-weight: 400;
    }

    .child-item .nav-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      opacity: 0.6;
    }

    .child-item:hover {
      color: var(--pc-text-primary) !important;
      background: rgba(255, 255, 255, 0.03);
    }

    .child-item.active {
      color: var(--pc-yellow) !important;
      background: rgba(242, 201, 76, 0.08);
      font-weight: 500;
    }

    .child-item.active .nav-icon {
      color: var(--pc-yellow);
      opacity: 1;
    }

    .child-item.active::before {
      display: none; /* Hide the big left bar for child items to keep it subtle */
    }

    .nav-badge {
      margin-left: auto;
      background: var(--pc-red);
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 10px;
      min-width: 20px;
      text-align: center;
    }

    .collapsed-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      margin-left: 0;
      padding: 1px 5px;
      font-size: 0.6rem;
    }

    .sidebar-footer {
      padding: 8px;
      border-top: 1px solid var(--pc-border);
    }

    .logout-btn {
      color: var(--pc-text-muted) !important;
    }

    .logout-btn:hover {
      color: var(--pc-red) !important;
      background: rgba(229, 57, 53, 0.08) !important;
    }

    /* --- Main wrapper --- */
    .main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    /* --- Header --- */
    .header {
      height: var(--pc-header-height);
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--pc-border);
      background: rgba(15, 15, 26, 0.8);
      backdrop-filter: blur(20px);
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .mobile-menu-btn {
      display: none;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-alert-btn {
      color: var(--pc-text-secondary);
    }

    .user-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px 6px 6px;
      border-radius: 40px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--pc-border);
      cursor: pointer;
      transition: all var(--pc-transition-fast);
      color: var(--pc-text-primary);
      font-family: var(--pc-font-body);
    }

    .user-chip:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--pc-border-active);
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--pc-yellow), var(--pc-yellow-dark));
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      color: #1A1A2E;
      flex-shrink: 0;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }

    .user-name {
      font-size: 0.82rem;
      font-weight: 600;
    }

    .user-role {
      font-size: 0.7rem;
      color: var(--pc-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .user-chevron {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--pc-text-muted);
    }

    /* --- Main content --- */
    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      background: var(--pc-bg-primary);
    }

    /* --- Mobile --- */
    .mobile-overlay {
      display: none;
    }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        transform: translateX(0);
        z-index: 200;
        box-shadow: var(--pc-shadow-lg);
      }

      .sidebar.collapsed {
        transform: translateX(-100%);
        width: var(--pc-sidebar-width);
      }

      .mobile-menu-btn {
        display: flex;
      }

      .mobile-overlay {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 150;
      }

      .user-info {
        display: none;
      }

      .user-chevron {
        display: none;
      }

      .main-content {
        padding: 16px;
      }
    }

    /* --- Toasts globales --- */
    .toast-stack {
      position: fixed; bottom: 24px; right: 24px; z-index: 2000;
      display: flex; flex-direction: column; gap: 10px; max-width: 380px;
    }
    .toast {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; border-radius: var(--pc-radius-md);
      box-shadow: 0 10px 30px rgba(0,0,0,0.45); font-size: 0.88rem; font-weight: 500;
      color: #fff; animation: toastIn 0.2s ease;
      border: 1px solid rgba(255,255,255,0.12);
    }
    .toast mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .toast span { flex: 1; line-height: 1.3; }
    .toast .toast-close { background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; display: flex; padding: 0; }
    .toast .toast-close:hover { color: #fff; }
    .toast .toast-close mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .t-success { background: #065F46; border-color: #10B981; }
    .t-error { background: #7F1D1D; border-color: #EF4444; }
    .t-info { background: #1E3A5F; border-color: #3B82F6; }
    @keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

    @media (max-width: 600px) { .toast-stack { left: 12px; right: 12px; bottom: 12px; max-width: none; } }

    /* --- Diálogo de confirmación --- */
    .confirm-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(3px);
      z-index: 2100; display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .confirm-card {
      background: var(--pc-bg-sidebar); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg);
      width: 100%; max-width: 420px; padding: 28px 24px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      animation: toastIn 0.18s ease;
    }
    .confirm-icon { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px; background: rgba(59,130,246,0.15); color: #60A5FA; }
    .confirm-icon.danger { background: rgba(239,68,68,0.15); color: #F87171; }
    .confirm-icon mat-icon { font-size: 30px; width: 30px; height: 30px; }
    .confirm-card h3 { font-family: var(--pc-font-heading); font-size: 1.25rem; margin-bottom: 8px; color: var(--pc-text-primary); }
    .confirm-card p { color: var(--pc-text-secondary); font-size: 0.92rem; line-height: 1.45; margin-bottom: 22px; }
    .confirm-actions { display: flex; gap: 12px; justify-content: center; }
    .cf-cancel, .cf-ok { padding: 10px 20px; border-radius: var(--pc-radius-md); font-weight: 600; cursor: pointer; font-size: 0.92rem; border: 1px solid var(--pc-border); }
    .cf-cancel { background: rgba(255,255,255,0.05); color: var(--pc-text-primary); }
    .cf-cancel:hover { background: rgba(255,255,255,0.1); }
    .cf-ok { background: var(--pc-yellow); color: #1A1A2E; border-color: var(--pc-yellow); }
    .cf-ok.danger { background: #EF4444; color: #fff; border-color: #EF4444; }
    .cf-ok:hover { filter: brightness(1.1); }

    /* --- Barra de carga global (carga inicial de datos) --- */
    .global-loading-bar {
      position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 3000;
      background: linear-gradient(90deg, transparent, var(--pc-yellow), transparent);
      background-size: 40% 100%; background-repeat: no-repeat;
      animation: loadingSlide 1.1s infinite ease-in-out;
    }
    @keyframes loadingSlide {
      0% { background-position: -40% 0; }
      100% { background-position: 140% 0; }
    }
  `],
})
export class LayoutComponent {
  sidebarCollapsed = signal(false);
  expandedNavs = signal<Set<string>>(new Set());

  private navItems: NavItem[] = [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard', permission: 'dashboard.view' },
    { 
      icon: 'inventory_2', 
      label: 'Inventario', 
      route: '/inventory', 
      permission: 'inventory.view',
      children: [
        { icon: 'inventory', label: 'Gestión', route: '/inventory', permission: 'inventory.view' },
        { icon: 'local_shipping', label: 'Proveedores', route: '/suppliers', permission: 'suppliers.view' },
        { icon: 'shopping_cart', label: 'Pedidos', route: '/orders', permission: 'orders.view' }
      ]
    },
    { 
      icon: 'assessment', 
      label: 'Reportes', 
      route: '/reports', 
      permission: 'reports.view',
      children: [
        { icon: 'analytics', label: 'Resumen General', route: '/reports/dashboard', permission: 'reports.view' },
        { icon: 'percent', label: 'Margen de Ganancia', route: '/reports/margin', permission: 'reports.view' },
        { icon: 'list_alt', label: 'Cierre de Inventario', route: '/reports/closing-inventory', permission: 'reports.view' },
        { icon: 'history', label: 'Actividad de Inventario', route: '/reports/inventory-activity', permission: 'reports.view' }
      ]
    },
    { icon: 'calendar_month', label: 'Horarios', route: '/schedule', permission: 'schedule.view' },
    { icon: 'restaurant', label: 'Recetas', route: '/recipes', permission: 'recipes.view' },
    { icon: 'move_up', label: 'Envíos a Locales', route: '/dispatches', permission: 'dispatch.view' },
    { 
      icon: 'trending_up', 
      label: 'Precios', 
      route: '/prices', 
      permission: 'prices.view',
      children: [
        { icon: 'list', label: 'Registro de Precios', route: '/prices/list', permission: 'prices.view' },
        { icon: 'show_chart', label: 'Reportes de Aumento', route: '/prices/reports', permission: 'prices.view' }
      ]
    },
    { icon: 'notifications_active', label: 'Alertas', route: '/alerts', permission: 'alerts.view' },
    {
      icon: 'account_balance',
      label: 'Contabilidad',
      route: '/contabilidad',
      permission: 'accounting.view',
      children: [
        { icon: 'summarize', label: 'Resumen / P&L', route: '/contabilidad/resumen', permission: 'accounting.view' },
        { icon: 'receipt_long', label: 'Transacciones', route: '/contabilidad/transacciones', permission: 'accounting.view' },
        { icon: 'upload_file', label: 'Importar Cierre', route: '/contabilidad/importar-cierre', permission: 'accounting.edit' },
        { icon: 'account_tree', label: 'Plan de Cuentas', route: '/contabilidad/cuentas', permission: 'accounting.view' }
      ]
    },
    { icon: 'people', label: 'Usuarios', route: '/users', permission: 'users.view' },
  ];

  visibleNavItems = computed(() =>
    this.navItems
      .filter(item => this.auth.hasPermission(item.permission))
      .map(item => item.children
        ? { ...item, children: item.children.filter(c => this.auth.hasPermission(c.permission)) }
        : item)
  );

  activeAlertCount = computed(() => this.dataService.activeAlerts().length);

  constructor(
    public auth: AuthService,
    public dataService: DataService,
    public notify: NotificationService,
    public confirm: ConfirmService
  ) {}

  getRoleLabel(role: string | null): string {
    const labels: Record<string, string> = {
      master: 'Master',
      manager: 'Manager',
      operations: 'Operaciones',
    };
    return role ? labels[role] || role : '';
  }

  toggleExpand(route: string) {
    this.expandedNavs.update(set => {
      const newSet = new Set(set);
      if (newSet.has(route)) {
        newSet.delete(route);
      } else {
        newSet.add(route);
      }
      return newSet;
    });
  }

  isExpanded(route: string): boolean {
    return this.expandedNavs().has(route);
  }

  isChildActive(parentRoute: string): boolean {
    // Basic check using window.location.pathname
    return window.location.pathname.startsWith(parentRoute);
  }
}
