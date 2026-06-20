import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/layout/layout.component';
import { authGuard, roleGuard, adminGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [roleGuard('dashboard.view')]
      },
      {
        path: 'inventory',
        canActivate: [roleGuard('inventory.view')],
        loadComponent: () => import('./features/inventory/inventory.component').then(m => m.InventoryComponent)
      },
      {
        path: 'reports',
        canActivate: [roleGuard('reports.view')],
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: 'dashboard', loadComponent: () => import('./features/reports/reports-dashboard.component').then(m => m.ReportsDashboardComponent) },
          { path: 'margin', loadComponent: () => import('./features/reports/margin-report.component').then(m => m.MarginReportComponent) },
          { path: 'closing-inventory', loadComponent: () => import('./features/reports/closing-inventory.component').then(m => m.ClosingInventoryComponent) },
          { path: 'inventory-activity', loadComponent: () => import('./features/reports/inventory-activity.component').then(m => m.InventoryActivityComponent) }
        ]
      },
      {
        path: 'schedule',
        canActivate: [roleGuard('schedule.view')],
        loadComponent: () => import('./features/schedule/schedule.component').then(m => m.ScheduleComponent)
      },
      {
        path: 'recipes',
        canActivate: [roleGuard('recipes.view')],
        loadComponent: () => import('./features/recipes/recipes.component').then(m => m.RecipesComponent),
        children: [
          { path: '', redirectTo: 'list', pathMatch: 'full' },
          { path: 'list', loadComponent: () => import('./features/recipes/recipe-list.component').then(m => m.RecipeListComponent) },
          { path: 'create', canActivate: [roleGuard('recipes.create')], loadComponent: () => import('./features/recipes/recipe-form.component').then(m => m.RecipeFormComponent) },
          { path: 'edit/:id', canActivate: [roleGuard('recipes.create')], loadComponent: () => import('./features/recipes/recipe-form.component').then(m => m.RecipeFormComponent) }
        ]
      },
      {
        path: 'prices',
        canActivate: [roleGuard('prices.view')],
        loadComponent: () => import('./features/prices/prices.component').then(m => m.PricesComponent),
        children: [
          { path: '', redirectTo: 'list', pathMatch: 'full' },
          { path: 'list', loadComponent: () => import('./features/prices/price-list.component').then(m => m.PriceListComponent) },
          { path: 'reports', loadComponent: () => import('./features/prices/price-reports.component').then(m => m.PriceReportsComponent) }
        ]
      },
      {
        path: 'alerts',
        canActivate: [roleGuard('alerts.view')],
        loadComponent: () => import('./features/alerts/alerts.component').then(m => m.AlertsComponent)
      },
      {
        path: 'suppliers',
        canActivate: [roleGuard('suppliers.view')],
        loadComponent: () => import('./features/suppliers/suppliers.component').then(m => m.SuppliersComponent)
      },
      {
        path: 'orders',
        canActivate: [roleGuard('orders.view')],
        loadComponent: () => import('./features/orders/orders.component').then(m => m.OrdersComponent)
      },
      {
        path: 'dispatches',
        canActivate: [roleGuard('dispatch.view')],
        loadComponent: () => import('./features/dispatches/dispatches.component').then(m => m.DispatchesComponent)
      },
      {
        path: 'users',
        canActivate: [roleGuard('users.view')],
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'contabilidad',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/accounting/accounting.component').then(m => m.AccountingComponent),
        children: [
          { path: '', redirectTo: 'resumen', pathMatch: 'full' },
          { path: 'resumen', loadComponent: () => import('./features/accounting/accounting-dashboard.component').then(m => m.AccountingDashboardComponent) },
          { path: 'transacciones', loadComponent: () => import('./features/accounting/transactions.component').then(m => m.TransactionsComponent) },
          { path: 'cuentas', loadComponent: () => import('./features/accounting/accounts.component').then(m => m.AccountsComponent) }
        ]
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
