import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-prices',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">attach_money</mat-icon> Registro de Precios</h1>
          <p>Actualiza los precios de compra de los productos en inventario</p>
        </div>
        <div class="header-search">
          <mat-icon>search</mat-icon>
          <input type="text" [(ngModel)]="searchTerm" placeholder="Buscar producto..." class="pc-input">
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-bar stagger-children">
        <div class="stat-card animate-fade-in-up">
          <div class="stat-icon s-blue"><mat-icon>inventory_2</mat-icon></div>
          <div class="stat-info">
            <span class="stat-val">{{ filteredProducts().length }}</span>
            <span class="stat-lbl">Productos</span>
          </div>
        </div>
        <div class="stat-card animate-fade-in-up">
          <div class="stat-icon s-green"><mat-icon>price_check</mat-icon></div>
          <div class="stat-info">
            <span class="stat-val">\${{ avgPrice().toFixed(2) }}</span>
            <span class="stat-lbl">Precio Promedio</span>
          </div>
        </div>
      </div>

      <!-- Prices Table -->
      <div class="table-container">
        <table class="pc-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Unidad</th>
              <th class="text-right">Precio Actual</th>
              <th class="text-right">Nuevo Precio</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (product of filteredProducts(); track product.id) {
              <tr class="animate-fade-in-up">
                <td>
                  <div class="product-info">
                    <span class="product-icon">{{ getCategoryIcon(product.category) }}</span>
                    <span class="product-name">{{ product.name }}</span>
                  </div>
                </td>
                <td><span class="category-badge">{{ product.category }}</span></td>
                <td><span class="unit-badge">{{ product.unit }}</span></td>
                <td class="text-right font-bold">\${{ product.currentPrice.toFixed(2) }}</td>
                <td class="text-right">
                  <div class="price-input-group">
                    <span class="currency-symbol">$</span>
                    <input type="number" 
                           class="pc-input price-input" 
                           [ngModel]="editPrices()[product.id] || product.currentPrice"
                           (ngModelChange)="updateEditPrice(product.id, $event)"
                           min="0" step="0.01">
                  </div>
                </td>
                <td class="text-right">
                  <button class="btn-primary btn-small" 
                          [disabled]="!hasPriceChanged(product)"
                          (click)="savePrice(product.id)">
                    Guardar
                  </button>
                </td>
              </tr>
            }
            @if (filteredProducts().length === 0) {
              <tr>
                <td colspan="6" class="text-center py-8 text-muted">
                  <mat-icon class="opacity-50 text-4xl mb-2">search_off</mat-icon>
                  <p>No se encontraron productos.</p>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; }
    
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
    }
    
    .header-text h1 { font-family: var(--pc-font-heading); font-size: 1.8rem; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: var(--pc-yellow); }
    .header-text p { color: var(--pc-text-muted); font-size: 0.9rem; }
    
    .header-search {
      position: relative;
      display: flex; align-items: center;
    }
    
    .header-search mat-icon { position: absolute; left: 12px; color: var(--pc-text-muted); font-size: 20px; }
    .header-search input { padding-left: 40px; width: 300px; }

    /* Stats */
    .stats-bar { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg);
      padding: 16px 20px; display: flex; align-items: center; gap: 16px;
    }
    .stat-icon { width: 44px; height: 44px; border-radius: var(--pc-radius-md); display: flex; align-items: center; justify-content: center; }
    .stat-icon mat-icon { color: white; }
    .s-blue { background: linear-gradient(135deg, #3B82F6, #2563EB); }
    .s-green { background: linear-gradient(135deg, #10B981, #059669); }
    .stat-info { display: flex; flex-direction: column; }
    .stat-val { font-size: 1.4rem; font-weight: 700; font-family: var(--pc-font-heading); line-height: 1.2; }
    .stat-lbl { font-size: 0.75rem; color: var(--pc-text-muted); }

    /* Table */
    .table-container {
      background: rgba(22, 33, 62, 0.4);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      overflow-x: auto;
    }
    
    .pc-table { width: 100%; border-collapse: collapse; }
    .pc-table th, .pc-table td { padding: 16px 20px; border-bottom: 1px solid var(--pc-border); text-align: left; }
    .pc-table th { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pc-text-muted); font-weight: 600; background: rgba(0,0,0,0.2); }
    .pc-table tbody tr { transition: background var(--pc-transition-fast); }
    .pc-table tbody tr:hover { background: rgba(255,255,255,0.02); }
    .pc-table tbody tr:last-child td { border-bottom: none; }
    
    .product-info { display: flex; align-items: center; gap: 12px; }
    .product-icon { font-size: 20px; }
    .product-name { font-weight: 600; }
    
    .category-badge { background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; text-transform: capitalize; color: var(--pc-text-secondary); }
    .unit-badge { color: var(--pc-text-muted); font-size: 0.8rem; }
    
    .text-right { text-align: right !important; }
    .text-center { text-align: center !important; }
    .font-bold { font-weight: 700; color: var(--pc-text-primary); }
    .text-muted { color: var(--pc-text-muted); }
    .py-8 { padding-top: 32px !important; padding-bottom: 32px !important; }

    /* Inputs & Buttons */
    .price-input-group {
      display: inline-flex; align-items: center;
      background: rgba(0,0,0,0.2); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-md);
      overflow: hidden; width: 120px;
    }
    .price-input-group:focus-within { border-color: var(--pc-yellow); }
    .currency-symbol { padding: 0 0 0 12px; color: var(--pc-text-muted); font-weight: 600; }
    .price-input {
      border: none; background: transparent; padding: 8px; width: 100%;
      color: var(--pc-text-primary); font-weight: 600; font-family: var(--pc-font-body);
    }
    .price-input:focus { outline: none; }

    .btn-primary { background: var(--pc-yellow); color: #1A1A2E; border: none; padding: 8px 16px; border-radius: var(--pc-radius-md); font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(242, 201, 76, 0.2); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }
    .btn-small { padding: 6px 12px; font-size: 0.8rem; }
    
    .pc-input {
      background: rgba(0, 0, 0, 0.2); border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-md); padding: 10px 14px;
      color: var(--pc-text-primary); font-family: var(--pc-font-body);
    }
    .pc-input:focus { outline: none; border-color: var(--pc-yellow); }
  `]
})
export class PricesComponent {
  searchTerm = signal('');
  editPrices = signal<Record<string, number>>({});

  constructor(
    public auth: AuthService,
    private dataService: DataService
  ) {}

  filteredProducts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.dataService.products().filter(p => 
      p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
    );
  });

  avgPrice = computed(() => {
    const products = this.filteredProducts();
    if (products.length === 0) return 0;
    return products.reduce((sum, p) => sum + p.currentPrice, 0) / products.length;
  });

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      pollo: '🍗', insumos: '🧂', empaque: '📦', limpieza: '🧹', otro: '📋'
    };
    return icons[category] || '📦';
  }

  updateEditPrice(productId: string, price: number) {
    this.editPrices.update(prices => ({ ...prices, [productId]: price }));
  }

  hasPriceChanged(product: any): boolean {
    const currentEdit = this.editPrices()[product.id];
    return currentEdit !== undefined && currentEdit !== product.currentPrice;
  }

  savePrice(productId: string) {
    const newPrice = this.editPrices()[productId];
    if (newPrice !== undefined && newPrice > 0) {
      this.dataService.updateProduct(productId, { currentPrice: newPrice });
      // Remove from edit state to reset button
      this.editPrices.update(prices => {
        const newPrices = { ...prices };
        delete newPrices[productId];
        return newPrices;
      });
    }
  }
}
