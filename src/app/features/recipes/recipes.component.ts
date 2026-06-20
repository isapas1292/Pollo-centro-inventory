import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-recipes',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, MatIconModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">restaurant_menu</mat-icon> Recetario</h1>
          <p>Gestiona las preparaciones, sus ingredientes y costos estimados</p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-container">
        <a routerLink="list" routerLinkActive="active" class="tab-btn">
          <mat-icon>list</mat-icon> Lista de Recetas
        </a>
        @if (canManage()) {
          <a routerLink="create" routerLinkActive="active" class="tab-btn">
            <mat-icon>add_circle</mat-icon> Nueva Receta
          </a>
        }
      </div>

      <!-- Router Content -->
      <div class="tab-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; padding-bottom: 40px; }
    
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 24px;
    }
    
    .header-text h1 { font-family: var(--pc-font-heading); font-size: 1.8rem; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: var(--pc-yellow); }
    .header-text p { color: var(--pc-text-muted); font-size: 0.9rem; }

    /* Tabs */
    .tabs-container {
      display: flex; gap: 8px; margin-bottom: 24px;
      border-bottom: 1px solid var(--pc-border);
      padding-bottom: 8px;
    }

    .tab-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 20px; border-radius: var(--pc-radius-md);
      color: var(--pc-text-secondary); text-decoration: none;
      font-weight: 600; font-size: 0.95rem;
      transition: all var(--pc-transition-fast);
    }
    
    .tab-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .tab-btn:hover { background: rgba(255,255,255,0.05); color: var(--pc-text-primary); }
    
    .tab-btn.active {
      background: rgba(242, 201, 76, 0.1);
      color: var(--pc-yellow);
    }

    .tab-content {
      /* Sub-components will be rendered here */
    }
  `]
})
export class RecipesComponent {
  canManage = computed(() => this.auth.hasPermission('recipes.create'));
  constructor(public auth: AuthService) {}
}
