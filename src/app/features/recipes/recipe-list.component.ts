import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';
import { Recipe } from '../../core/models';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="recipes-grid stagger-children">
      @for (recipe of recipes(); track recipe.id) {
        <div class="recipe-card animate-fade-in-up">
          <div class="recipe-header">
            <h3>{{ recipe.name }}</h3>
            @if (canManage()) {
              <div class="actions">
                <button class="icon-btn" [routerLink]="['/recipes/edit', recipe.id]" matTooltip="Editar">
                  <mat-icon>edit</mat-icon>
                </button>
                <button class="icon-btn text-red" (click)="deleteRecipe(recipe.id)" matTooltip="Eliminar">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
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

          @if (canPrepare()) {
            <div class="recipe-footer">
              <button class="btn-prepare" (click)="openPrepare(recipe)">
                <mat-icon>local_fire_department</mat-icon> Preparar
              </button>
            </div>
          }
        </div>
      }

      @if (recipes().length === 0) {
        <div class="empty-state">
          <mat-icon>menu_book</mat-icon>
          <h3>No hay recetas</h3>
          <p>{{ canManage() ? 'Comienza creando tu primera receta para llevar un mejor control.' : 'Aún no hay recetas registradas.' }}</p>
          @if (canManage()) {
            <button class="btn-primary mt-4" routerLink="/recipes/create">Crear Receta</button>
          }
        </div>
      }
    </div>

    <!-- Modal Preparar -->
    @if (prepareRecipeSel(); as r) {
      <div class="modal-backdrop" (click)="closePrepare()">
        <div class="modal-card animate-fade-in-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><mat-icon>local_fire_department</mat-icon> Preparar receta</h2>
            <button class="modal-close" (click)="closePrepare()"><mat-icon>close</mat-icon></button>
          </div>
          <div class="modal-body">
            <p class="modal-recipe">{{ r.name }}</p>
            <label class="field-label">Cantidad a preparar</label>
            <input class="field-input" type="number" min="1" [(ngModel)]="prepareQty" (ngModelChange)="recheck()" />

            <div class="ingredients-preview">
              <div class="ip-title">Se descontará del inventario:</div>
              @for (ing of r.ingredients; track ing.productId) {
                <div class="ip-row">
                  <span>{{ ing.productName || ing.productId }}</span>
                  <span class="ip-qty">{{ ing.quantity * (prepareQty || 1) }}</span>
                </div>
              }
            </div>

            @if (prepareError()) {
              <div class="prepare-error">
                <mat-icon>error_outline</mat-icon>
                <div>
                  <strong>No hay stock suficiente:</strong>
                  <ul>@for (m of prepareMissing(); track m) { <li>{{ m }}</li> }</ul>
                </div>
              </div>
            }
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" (click)="closePrepare()">Cancelar</button>
            <button class="btn-send" [disabled]="prepareError() || !(prepareQty > 0)" (click)="confirmPrepare()">
              <mat-icon>check</mat-icon> Confirmar preparación
            </button>
          </div>
        </div>
      </div>
    }

    @if (toast(); as t) {
      <div class="toast animate-fade-in-up"><mat-icon>check_circle</mat-icon><span>{{ t }}</span></div>
    }
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

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-card { background: var(--pc-bg-sidebar, #16213e); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg); width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid var(--pc-border); }
    .modal-header h2 { font-size: 1.15rem; display: flex; align-items: center; gap: 8px; font-family: var(--pc-font-heading); }
    .modal-close { background: none; border: none; color: var(--pc-text-muted); cursor: pointer; display: flex; }
    .modal-close:hover { color: var(--pc-text-primary); }
    .modal-body { padding: 22px; display: flex; flex-direction: column; gap: 6px; }
    .modal-recipe { font-weight: 700; color: var(--pc-text-primary); font-size: 1.05rem; margin-bottom: 8px; }
    .field-label { font-size: 0.8rem; color: var(--pc-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .field-input { width: 100%; background: rgba(0,0,0,0.25); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-md); color: var(--pc-text-primary); padding: 10px 12px; font-size: 0.9rem; font-family: inherit; }
    .field-input:focus { outline: none; border-color: var(--pc-border-active, #60A5FA); }
    .ingredients-preview { margin-top: 14px; background: rgba(0,0,0,0.2); border-radius: var(--pc-radius-md); padding: 12px; }
    .ip-title { font-size: 0.78rem; color: var(--pc-text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    .ip-row { display: flex; justify-content: space-between; font-size: 0.88rem; padding: 3px 0; color: var(--pc-text-secondary); }
    .ip-qty { font-weight: 700; color: var(--pc-text-primary); }
    .prepare-error { display: flex; gap: 8px; margin-top: 14px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: var(--pc-radius-md); padding: 12px; color: #F87171; font-size: 0.85rem; }
    .prepare-error mat-icon { flex-shrink: 0; }
    .prepare-error ul { margin: 4px 0 0; padding-left: 18px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 18px 22px; border-top: 1px solid var(--pc-border); }
    .btn-cancel { background: rgba(255,255,255,0.05); color: var(--pc-text-primary); border: 1px solid var(--pc-border); padding: 8px 18px; border-radius: var(--pc-radius-md); font-weight: 600; cursor: pointer; }
    .btn-cancel:hover { background: rgba(255,255,255,0.1); }
    .btn-send { background: #EF4444; color: #fff; border: none; padding: 8px 18px; border-radius: var(--pc-radius-md); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .btn-send:hover { background: #DC2626; }
    .btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #065F46; color: #ECFDF5; border: 1px solid #10B981; padding: 12px 18px; border-radius: var(--pc-radius-md); box-shadow: 0 10px 30px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 8px; font-weight: 600; z-index: 1100; }
    .toast mat-icon { color: #34D399; }
  `]
})
export class RecipeListComponent {
  recipes = computed(() => this.dataService.recipes());

  // Permisos
  canManage = computed(() => this.auth.hasPermission('recipes.create'));
  canPrepare = computed(() => this.auth.hasPermission('recipes.prepare'));

  // Modal de preparación
  prepareRecipeSel = signal<Recipe | null>(null);
  prepareQty = 1;
  prepareMissing = signal<string[]>([]);
  prepareError = computed(() => this.prepareMissing().length > 0);
  toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private dataService: DataService,
    public auth: AuthService
  ) {}

  deleteRecipe(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar esta receta? No podrás deshacer esta acción.')) {
      this.dataService.deleteRecipe(id);
    }
  }

  openPrepare(recipe: Recipe) {
    this.prepareRecipeSel.set(recipe);
    this.prepareQty = 1;
    this.recheck();
  }

  closePrepare() {
    this.prepareRecipeSel.set(null);
    this.prepareMissing.set([]);
  }

  recheck() {
    const recipe = this.prepareRecipeSel();
    if (!recipe) return;
    const qty = this.prepareQty > 0 ? this.prepareQty : 1;
    const check = this.dataService.canPrepareRecipe(recipe.id, qty);
    this.prepareMissing.set(check.missing);
  }

  confirmPrepare() {
    const recipe = this.prepareRecipeSel();
    if (!recipe || this.prepareError() || this.prepareQty <= 0) return;
    const log = this.dataService.prepareRecipe(recipe.id, this.auth.userName() || 'Sistema', this.prepareQty);
    if (log) {
      this.showToast(`Preparado: ${this.prepareQty}× ${recipe.name}`);
      this.closePrepare();
    } else {
      this.recheck();
    }
  }

  private showToast(message: string) {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }
}
