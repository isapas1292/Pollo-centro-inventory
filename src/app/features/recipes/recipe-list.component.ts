import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  template: `
    <div class="recipes-grid stagger-children">
      @for (recipe of recipes(); track recipe.id) {
        <div class="recipe-card animate-fade-in-up">
          <div class="recipe-header">
            <h3>{{ recipe.name }}</h3>
            <div class="actions">
              <button class="icon-btn" [routerLink]="['/recipes/edit', recipe.id]" matTooltip="Editar">
                <mat-icon>edit</mat-icon>
              </button>
              <button class="icon-btn text-red" (click)="deleteRecipe(recipe.id)" matTooltip="Eliminar">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
          
          <p class="recipe-desc">{{ recipe.description }}</p>
          
          <div class="recipe-meta">
            <div class="meta-item">
              <mat-icon>science</mat-icon> {{ recipe.ingredients.length }} Ingredientes
            </div>
            <div class="meta-item cost-highlight">
              <mat-icon>attach_money</mat-icon> \${{ recipe.estimatedCost.toFixed(2) }} (Costo)
            </div>
          </div>
          
          <div class="recipe-footer">
            <button class="btn-prepare" routerLink="/recipes/prepare" [queryParams]="{ id: recipe.id }">
              <mat-icon>local_fire_department</mat-icon> Preparar
            </button>
          </div>
        </div>
      }

      @if (recipes().length === 0) {
        <div class="empty-state">
          <mat-icon>menu_book</mat-icon>
          <h3>No hay recetas</h3>
          <p>Comienza creando tu primera receta para llevar un mejor control.</p>
          <button class="btn-primary mt-4" routerLink="/recipes/create">Crear Receta</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .recipes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .recipe-card {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      padding: 20px;
      display: flex; flex-direction: column;
      transition: all var(--pc-transition-normal);
    }

    .recipe-card:hover {
      border-color: var(--pc-border-active);
      transform: translateY(-2px);
      box-shadow: var(--pc-shadow-glow);
    }

    .recipe-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 12px;
    }

    .recipe-header h3 {
      font-size: 1.25rem; font-weight: 700; font-family: var(--pc-font-heading);
      margin: 0; color: var(--pc-text-primary);
    }

    .actions { display: flex; gap: 4px; }
    .icon-btn { background: transparent; border: none; color: var(--pc-text-muted); cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s; }
    .icon-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .icon-btn:hover { color: var(--pc-yellow); background: rgba(242, 201, 76, 0.1); }
    .icon-btn.text-red:hover { color: #EF4444; background: rgba(239, 68, 68, 0.1); }

    .recipe-desc {
      font-size: 0.9rem; color: var(--pc-text-secondary);
      margin-bottom: 20px; flex: 1;
    }

    .recipe-meta {
      display: flex; flex-direction: column; gap: 8px;
      background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--pc-radius-md);
      margin-bottom: 16px;
    }

    .meta-item {
      display: flex; align-items: center; gap: 8px;
      font-size: 0.85rem; color: var(--pc-text-muted); font-weight: 500;
    }
    .meta-item mat-icon { font-size: 18px; width: 18px; height: 18px; }
    
    .cost-highlight { color: #10B981; font-weight: 600; }
    .cost-highlight mat-icon { color: #10B981; }

    .recipe-footer {
      border-top: 1px solid rgba(255,255,255,0.05);
      padding-top: 16px; display: flex; justify-content: flex-end;
    }

    .btn-prepare {
      background: rgba(239, 68, 68, 0.1); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 8px 16px; border-radius: var(--pc-radius-md); font-weight: 600; cursor: pointer;
      display: flex; align-items: center; gap: 6px; transition: all 0.2s; text-decoration: none;
    }
    .btn-prepare:hover { background: #EF4444; color: white; }

    /* Empty State */
    .empty-state {
      grid-column: 1 / -1;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 60px 20px; background: rgba(22, 33, 62, 0.4); border-radius: var(--pc-radius-lg);
      border: 1px dashed var(--pc-border); text-align: center;
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--pc-text-muted); margin-bottom: 16px; opacity: 0.5; }
    .empty-state h3 { font-size: 1.4rem; color: var(--pc-text-primary); margin-bottom: 8px; }
    .empty-state p { color: var(--pc-text-muted); font-size: 0.95rem; }
    .mt-4 { margin-top: 16px; }

    .btn-primary { background: var(--pc-yellow); color: #1A1A2E; border: none; padding: 10px 20px; border-radius: var(--pc-radius-md); font-weight: 600; cursor: pointer; }
  `]
})
export class RecipeListComponent {
  recipes = computed(() => this.dataService.recipes());

  constructor(
    private dataService: DataService,
    public auth: AuthService
  ) {}

  deleteRecipe(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar esta receta? No podrás deshacer esta acción.')) {
      this.dataService.deleteRecipe(id);
    }
  }
}
