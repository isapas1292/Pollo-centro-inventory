import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/layout/layout.component';
import { authGuard, roleGuard } from './core/guards/auth.guard';
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
        component: DashboardComponent 
      },
      { 
        path: 'inventory', 
        loadComponent: () => import('./features/inventory/inventory.component').then(m => m.InventoryComponent) 
      },
      { 
        path: 'reports', 
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent) 
      },
      { 
        path: 'recipes', 
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) 
      },
      { 
        path: 'prices', 
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) 
      },
      { 
        path: 'alerts', 
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) 
      },
      { 
        path: 'users', 
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) 
      }
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];
