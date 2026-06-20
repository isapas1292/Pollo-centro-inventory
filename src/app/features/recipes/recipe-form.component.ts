import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';
import { Product, RecipeIngredient } from '../../core/models';

@Component({
  selector: 'app-recipe-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatButtonModule],
  template: `
    <div class="form-container animate-fade-in-up">
      <div class="form-header">
        <h2>{{ isEdit() ? 'Editar Receta' : 'Crear Nueva Receta' }}</h2>
        <button class="btn-icon" routerLink="/recipes/list"><mat-icon>close</mat-icon></button>
      </div>

      <div class="form-body">
        <!-- Basic Info -->
        <div class="section-box">
          <div class="form-group">
            <label>Nombre de la Receta</label>
            <input type="text" [(ngModel)]="name" class="pc-input" placeholder="Ej. Combo Familiar 1">
          </div>
          <div class="form-group">
            <label>Descripción / Instrucciones</label>
            <textarea [(ngModel)]="description" class="pc-input" rows="3" placeholder="Instrucciones breves..."></textarea>
          </div>
        </div>

        <!-- Ingredients Section -->
        <div class="section-box">
          <h3 class="section-title"><mat-icon>science</mat-icon> Ingredientes</h3>
          
          <div class="add-ingredient-bar">
            <select [(ngModel)]="selectedProductId" class="pc-select" (change)="onProductSelect()">
              <option value="">Seleccionar producto del inventario...</option>
              @for (cat of groupedProducts(); track cat.category) {
                <optgroup [label]="cat.category.toUpperCase()">
                  @for (p of cat.items; track p.id) {
                    <option [value]="p.id">{{ p.name }} ({{ '$' }}{{ p.currentPrice }}/{{ p.unit }})</option>
                  }
                </optgroup>
              }
            </select>
            
            <input type="number" [(ngModel)]="selectedQuantity" class="pc-input qty-input" placeholder="Cant." min="0.1" step="0.1">
            <span class="unit-label">{{ selectedUnit() }}</span>
            
            <button class="btn-secondary" (click)="addIngredient()" [disabled]="!selectedProductId() || selectedQuantity() <= 0">
              <mat-icon>add</mat-icon> Agregar
            </button>
          </div>

          <!-- Ingredients List -->
          <div class="ingredients-list">
            <div class="list-header" *ngIf="ingredients().length > 0">
              <span class="col-name">Producto</span>
              <span class="col-qty">Cantidad</span>
              <span class="col-cost text-right">Costo Est.</span>
              <span class="col-action"></span>
            </div>
            
            @for (ing of ingredients(); track ing.productId; let idx = $index) {
              <div class="list-item">
                <span class="col-name">{{ ing.productName }}</span>
                <span class="col-qty">
                  <input type="number" [ngModel]="ing.quantity" (ngModelChange)="updateIngredientQty(idx, $event)" class="pc-input small-input" min="0.1" step="0.1">
                  {{ getProductUnit(ing.productId) }}
                </span>
                <span class="col-cost text-right">{{ '$' }}{{ getIngredientCost(ing).toFixed(2) }}</span>
                <span class="col-action">
                  <button class="icon-btn text-red" (click)="removeIngredient(idx)"><mat-icon>delete</mat-icon></button>
                </span>
              </div>
            }

            @if (ingredients().length === 0) {
              <div class="empty-ingredients">
                <p>No se han agregado ingredientes.</p>
              </div>
            }
          </div>
        </div>

        <!-- Summary -->
        <div class="summary-box">
          <div class="summary-row">
            <span>Costo de producción (ingredientes):</span>
            <span class="total-cost">RD$ {{ estimatedCost().toFixed(2) }}</span>
          </div>
          <div class="summary-row">
            <span>Precio de venta al consumidor:</span>
            <input type="number" min="0" step="0.01" class="price-input"
                   [ngModel]="salePrice()" (ngModelChange)="salePrice.set(+$event || 0)" placeholder="0.00">
          </div>
          <div class="summary-row margin-row" [class.pos]="margin() >= 0" [class.neg]="margin() < 0">
            <span>Margen de ganancia:</span>
            <span>RD$ {{ margin().toFixed(2) }} ({{ marginPct().toFixed(1) }}%)</span>
          </div>
        </div>
      </div>

      <div class="form-footer">
        <button class="btn-secondary" routerLink="/recipes/list">Cancelar</button>
        <button class="btn-primary" (click)="saveRecipe()" [disabled]="!isValid()">
          <mat-icon>save</mat-icon> {{ isEdit() ? 'Actualizar Receta' : 'Guardar Receta' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .form-container {
      max-width: 800px; margin: 0 auto;
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg);
      overflow: hidden; box-shadow: var(--pc-shadow-lg);
    }

    .form-header {
      padding: 20px 24px; border-bottom: 1px solid var(--pc-border);
      display: flex; justify-content: space-between; align-items: center;
      background: rgba(0,0,0,0.2);
    }
    .form-header h2 { font-family: var(--pc-font-heading); font-size: 1.4rem; color: var(--pc-text-primary); }
    .btn-icon { background: transparent; border: none; color: var(--pc-text-muted); cursor: pointer; transition: color 0.2s; }
    .btn-icon:hover { color: var(--pc-text-primary); }

    .form-body { padding: 24px; display: flex; flex-direction: column; gap: 24px; }

    .section-box { background: rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: var(--pc-radius-md); }
    .section-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; color: var(--pc-text-primary); }
    .section-title mat-icon { color: var(--pc-yellow); font-size: 20px; width: 20px; height: 20px; }

    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 8px; font-size: 0.85rem; color: var(--pc-text-secondary); }

    .pc-input, .pc-select {
      width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-md); padding: 10px 14px;
      color: var(--pc-text-primary); font-family: var(--pc-font-body); transition: all 0.2s;
    }
    .pc-input:focus, .pc-select:focus { outline: none; border-color: var(--pc-yellow); background: rgba(0,0,0,0.5); }
    .pc-select option, .pc-select optgroup { background: var(--pc-bg-sidebar); }
    textarea.pc-input { resize: vertical; min-height: 80px; }

    /* Ingredients Bar */
    .add-ingredient-bar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
    .qty-input { width: 100px; }
    .unit-label { font-size: 0.85rem; color: var(--pc-text-muted); min-width: 40px; }

    /* Ingredients List */
    .ingredients-list { border: 1px solid var(--pc-border); border-radius: var(--pc-radius-md); overflow: hidden; }
    .list-header { display: flex; padding: 10px 16px; background: rgba(0,0,0,0.3); border-bottom: 1px solid var(--pc-border); font-size: 0.8rem; text-transform: uppercase; color: var(--pc-text-muted); font-weight: 600; }
    .list-item { display: flex; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center; transition: background 0.2s; }
    .list-item:hover { background: rgba(255,255,255,0.02); }
    .list-item:last-child { border-bottom: none; }
    
    .col-name { flex: 2; font-weight: 500; }
    .col-qty { flex: 1; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--pc-text-secondary); }
    .col-cost { flex: 1; font-weight: 600; color: #10B981; }
    .col-action { width: 40px; display: flex; justify-content: flex-end; }
    
    .small-input { padding: 4px 8px; width: 70px; text-align: right; }
    .text-right { text-align: right; }

    .icon-btn { background: transparent; border: none; cursor: pointer; padding: 4px; border-radius: 4px; }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .icon-btn.text-red { color: #EF4444; opacity: 0.7; }
    .icon-btn.text-red:hover { opacity: 1; background: rgba(239, 68, 68, 0.1); }

    .empty-ingredients { padding: 32px; text-align: center; color: var(--pc-text-muted); font-size: 0.9rem; }

    /* Summary */
    .summary-box {
      display: flex; flex-direction: column; gap: 12px;
      background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2);
      padding: 16px 24px; border-radius: var(--pc-radius-md);
      font-size: 1rem; font-weight: 600;
    }
    .summary-row { display: flex; justify-content: space-between; align-items: center; }
    .total-cost { font-size: 1.3rem; color: #FBBF24; font-family: var(--pc-font-heading); }
    .price-input {
      width: 160px; text-align: right; background: rgba(0,0,0,0.25); border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-sm); padding: 8px 12px; color: var(--pc-text-primary);
      font-family: var(--pc-font-heading); font-size: 1.1rem;
    }
    .price-input:focus { outline: none; border-color: var(--pc-yellow); }
    .margin-row { border-top: 1px dashed rgba(255,255,255,0.15); padding-top: 12px; font-size: 1.1rem; }
    .margin-row.pos span:last-child { color: #34D399; font-family: var(--pc-font-heading); }
    .margin-row.neg span:last-child { color: #F87171; font-family: var(--pc-font-heading); }

    /* Footer */
    .form-footer {
      padding: 16px 24px; border-top: 1px solid var(--pc-border);
      display: flex; justify-content: flex-end; gap: 12px; background: rgba(0,0,0,0.2);
    }

    .btn-primary { background: var(--pc-yellow); color: #1A1A2E; border: none; padding: 10px 20px; border-radius: var(--pc-radius-md); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
    .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(242, 201, 76, 0.2); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }
    
    .btn-secondary { background: rgba(255,255,255,0.05); color: var(--pc-text-primary); border: 1px solid var(--pc-border); padding: 10px 20px; border-radius: var(--pc-radius-md); font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .btn-secondary:hover { background: rgba(255,255,255,0.1); }

    @media (max-width: 600px) {
      .add-ingredient-bar { flex-direction: column; align-items: stretch; }
      .qty-input { width: 100%; }
    }
  `]
})
export class RecipeFormComponent implements OnInit {
  isEdit = signal(false);
  recipeId: string | null = null;

  name = signal('');
  description = signal('');
  ingredients = signal<RecipeIngredient[]>([]);
  salePrice = signal<number>(0);

  selectedProductId = signal('');
  selectedQuantity = signal<number>(1);
  selectedUnit = signal('-');

  constructor(
    private dataService: DataService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEdit.set(true);
        this.recipeId = id;
        this.loadRecipe(id);
      }
    });
  }

  // --- Computed ---

  groupedProducts = computed(() => {
    const products = this.dataService.products();
    const groups: Record<string, Product[]> = {};
    
    products.forEach(p => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    
    return Object.keys(groups).map(category => ({
      category,
      items: groups[category].sort((a, b) => a.name.localeCompare(b.name))
    }));
  });

  estimatedCost = computed(() => {
    let total = 0;
    const currentIngredients = this.ingredients();
    const products = this.dataService.products();

    for (const ing of currentIngredients) {
      const p = products.find(prod => prod.id === ing.productId);
      if (p) {
        total += p.currentPrice * ing.quantity;
      }
    }
    return total;
  });

  margin = computed(() => this.salePrice() - this.estimatedCost());
  marginPct = computed(() => this.salePrice() > 0 ? (this.margin() / this.salePrice()) * 100 : 0);

  // --- Methods ---

  loadRecipe(id: string) {
    const recipe = this.dataService.recipes().find(r => r.id === id);
    if (recipe) {
      this.name.set(recipe.name);
      this.description.set(recipe.description);
      this.salePrice.set(recipe.salePrice ?? 0);
      // Create a deep copy of ingredients so we don't modify the state directly
      this.ingredients.set(JSON.parse(JSON.stringify(recipe.ingredients)));
    } else {
      this.router.navigate(['/recipes/list']);
    }
  }

  onProductSelect() {
    const id = this.selectedProductId();
    if (!id) {
      this.selectedUnit.set('-');
      return;
    }
    const product = this.dataService.products().find(p => p.id === id);
    if (product) {
      this.selectedUnit.set(product.unit);
      this.selectedQuantity.set(1);
    }
  }

  addIngredient() {
    const id = this.selectedProductId();
    const qty = this.selectedQuantity();
    if (!id || qty <= 0) return;

    const product = this.dataService.products().find(p => p.id === id);
    if (!product) return;

    this.ingredients.update(list => {
      const existingIdx = list.findIndex(i => i.productId === id);
      if (existingIdx >= 0) {
        // Update existing
        const newList = [...list];
        newList[existingIdx].quantity += qty;
        return newList;
      } else {
        // Add new
        return [...list, { productId: id, productName: product.name, quantity: qty }];
      }
    });

    // Reset selection
    this.selectedProductId.set('');
    this.selectedQuantity.set(1);
    this.selectedUnit.set('-');
  }

  updateIngredientQty(index: number, newQty: number) {
    if (newQty <= 0) return;
    this.ingredients.update(list => {
      const newList = [...list];
      newList[index].quantity = newQty;
      return newList;
    });
  }

  removeIngredient(index: number) {
    this.ingredients.update(list => list.filter((_, i) => i !== index));
  }

  getProductUnit(productId: string): string {
    const p = this.dataService.products().find(prod => prod.id === productId);
    return p ? p.unit : '';
  }

  getIngredientCost(ing: RecipeIngredient): number {
    const p = this.dataService.products().find(prod => prod.id === ing.productId);
    return p ? p.currentPrice * ing.quantity : 0;
  }

  isValid(): boolean {
    return this.name().trim().length > 0 && this.ingredients().length > 0;
  }

  saveRecipe() {
    if (!this.isValid()) return;

    const recipeData = {
      name: this.name(),
      description: this.description(),
      ingredients: this.ingredients(),
      estimatedCost: this.estimatedCost(),
      salePrice: this.salePrice(),
      createdBy: this.auth.user()?.displayName ?? 'Sistema'
    };

    if (this.isEdit() && this.recipeId) {
      this.dataService.updateRecipe(this.recipeId, recipeData);
    } else {
      this.dataService.addRecipe(recipeData);
    }

    this.router.navigate(['/recipes/list']);
  }
}
