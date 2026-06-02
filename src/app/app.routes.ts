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
        path: 'schedule', 
        loadComponent: () => import('./features/schedule/schedule.component').then(m => m.ScheduleComponent) 
      },
      { 
        path: 'recipes', 
        loadComponent: () => import('./features/recipes/recipes.component').then(m => m.RecipesComponent),
        children: [
          { path: '', redirectTo: 'list', pathMatch: 'full' },
          { path: 'list', loadComponent: () => import('./features/recipes/recipe-list.component').then(m => m.RecipeListComponent) },
          { path: 'create', loadComponent: () => import('./features/recipes/recipe-form.component').then(m => m.RecipeFormComponent) },
          { path: 'edit/:id', loadComponent: () => import('./features/recipes/recipe-form.component').then(m => m.RecipeFormComponent) }
        ]
      },
      { 
        path: 'prices', 
        loadComponent: () => import('./features/prices/prices.component').then(m => m.PricesComponent) 
      },
      { 
        path: 'alerts', 
        loadComponent: () => import('./features/alerts/alerts.component').then(m => m.AlertsComponent) 
      },
      { 
        path: 'users', 
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent) 
      }
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];
