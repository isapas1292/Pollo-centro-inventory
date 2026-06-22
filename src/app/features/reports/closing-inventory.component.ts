import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-closing-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="report-page animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1><mat-icon>inventory_2</mat-icon> Cierre de Inventario</h1>
          <p>Existencias y valorización actual del inventario consolidado.</p>
        </div>
        <button class="btn-primary" (click)="exportCsv()" [disabled]="items().length === 0">
          <mat-icon>download</mat-icon> Exportar CSV
        </button>
      </div>

      <div class="kpi-grid">
        <div class="kpi"><span>Productos</span><strong>{{ items().length }}</strong></div>
        <div class="kpi"><span>Unidades en stock</span><strong>{{ totalUnits() | number:'1.0-2' }}</strong></div>
        <div class="kpi"><span>Valor del inventario</span><strong>$ {{ totalValue() | number:'1.2-2' }}</strong></div>
        <div class="kpi warning"><span>Stock bajo o crítico</span><strong>{{ lowStockCount() }}</strong></div>
      </div>

      <div class="filters-row">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input class="pc-input" type="search" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Buscar producto o proveedor">
        </div>
        <select class="pc-select" [ngModel]="category()" (ngModelChange)="category.set($event)">
          <option value="all">Todas las categorías</option>
          @for (name of categories(); track name) { <option [value]="name">{{ name }}</option> }
        </select>
        <select class="pc-select" [ngModel]="status()" (ngModelChange)="status.set($event)">
          <option value="all">Todos los estados</option>
          <option value="ok">Disponible</option>
          <option value="low">Stock bajo</option>
          <option value="critical">Crítico</option>
          <option value="empty">Agotado</option>
        </select>
      </div>

      <div class="table-card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th><th>Categoría</th><th>Proveedor</th><th class="right">Stock</th>
                <th>Unidad</th><th class="right">Costo unitario</th><th class="right">Valor total</th>
                <th>Estado</th><th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item.id) {
                <tr>
                  <td class="name">{{ item.name }}</td>
                  <td>{{ item.category }}</td>
                  <td>{{ item.supplierName || 'Sin proveedor' }}</td>
                  <td class="right">{{ item.currentStock | number:'1.0-2' }}</td>
                  <td>{{ item.unit }}</td>
                  <td class="right">$ {{ item.currentPrice | number:'1.2-2' }}</td>
                  <td class="right value">$ {{ item.currentStock * item.currentPrice | number:'1.2-2' }}</td>
                  <td><span class="status" [attr.data-status]="stockStatus(item.currentStock, item.minStock)">{{ statusLabel(item.currentStock, item.minStock) }}</span></td>
                  <td>{{ item.lastUpdated | date:'dd/MM/yyyy HH:mm' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="9" class="empty">No hay productos que coincidan con los filtros.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .report-page { max-width: 1400px; margin: 0 auto; padding: 16px 16px 40px; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:20px; }
    h1 { display:flex; align-items:center; gap:10px; font-family:var(--pc-font-heading); font-size:1.8rem; margin-bottom:4px; }
    h1 mat-icon { color:var(--pc-yellow); } p { color:var(--pc-text-muted); font-size:.9rem; }
    .btn-primary { display:flex; align-items:center; gap:8px; background:var(--pc-yellow); color:#1A1A2E; border:0; padding:10px 18px; border-radius:var(--pc-radius-md); font-weight:700; cursor:pointer; }
    .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
    .kpi-grid { display:grid; grid-template-columns:repeat(4,minmax(160px,1fr)); gap:12px; margin-bottom:18px; }
    .kpi { padding:16px; border:1px solid var(--pc-border); background:rgba(22,33,62,.55); border-radius:var(--pc-radius-md); display:flex; flex-direction:column; gap:5px; }
    .kpi span { color:var(--pc-text-muted); font-size:.76rem; text-transform:uppercase; }
    .kpi strong { font-family:var(--pc-font-heading); font-size:1.25rem; }
    .kpi.warning strong { color:#FBBF24; }
    .filters-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
    .search-box { position:relative; flex:1; min-width:240px; max-width:420px; }
    .search-box mat-icon { position:absolute; left:11px; top:10px; color:var(--pc-text-muted); font-size:19px; }
    .pc-input,.pc-select { height:40px; background:rgba(0,0,0,.2); border:1px solid var(--pc-border); border-radius:var(--pc-radius-md); color:var(--pc-text-primary); padding:0 12px; font-family:var(--pc-font-body); }
    .pc-input { width:100%; padding-left:38px; } .pc-select { min-width:180px; } .pc-select option { background:var(--pc-bg-sidebar); }
    .pc-input:focus,.pc-select:focus { outline:none; border-color:var(--pc-yellow); }
    .table-card { border:1px solid var(--pc-border); background:rgba(22,33,62,.5); border-radius:var(--pc-radius-lg); overflow:hidden; }
    .table-wrap { overflow:auto; } table { width:100%; border-collapse:collapse; min-width:1100px; }
    th { padding:12px 14px; text-align:left; background:rgba(0,0,0,.35); color:var(--pc-text-muted); font-size:.72rem; text-transform:uppercase; }
    td { padding:12px 14px; border-top:1px solid var(--pc-border); font-size:.84rem; color:var(--pc-text-secondary); }
    tr:hover td { background:rgba(255,255,255,.025); } .name { color:var(--pc-text-primary); font-weight:600; } .right { text-align:right; } .value { color:#60A5FA; font-weight:700; }
    .status { display:inline-block; padding:3px 8px; border-radius:4px; font-size:.7rem; font-weight:700; }
    .status[data-status="ok"] { color:#34D399; background:rgba(16,185,129,.12); }
    .status[data-status="low"] { color:#FBBF24; background:rgba(245,158,11,.12); }
    .status[data-status="critical"],.status[data-status="empty"] { color:#F87171; background:rgba(239,68,68,.12); }
    .empty { text-align:center; padding:34px; color:var(--pc-text-muted); }
    @media(max-width:800px){ .kpi-grid{grid-template-columns:repeat(2,1fr);} }
  `]
})
export class ClosingInventoryComponent {
  private data = inject(DataService);
  search = signal('');
  category = signal('all');
  status = signal('all');

  categories = computed(() => [...new Set(this.data.products().map(p => p.category))].sort());
  items = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.data.products().filter(p => {
      const matchesSearch = !term || p.name.toLowerCase().includes(term) || (p.supplierName ?? '').toLowerCase().includes(term);
      return matchesSearch && (this.category() === 'all' || p.category === this.category())
        && (this.status() === 'all' || this.stockStatus(p.currentStock, p.minStock) === this.status());
    });
  });
  totalUnits = computed(() => this.items().reduce((sum, p) => sum + p.currentStock, 0));
  totalValue = computed(() => this.items().reduce((sum, p) => sum + p.currentStock * p.currentPrice, 0));
  lowStockCount = computed(() => this.items().filter(p => this.stockStatus(p.currentStock, p.minStock) !== 'ok').length);

  stockStatus(stock: number, minimum: number): 'ok' | 'low' | 'critical' | 'empty' {
    if (stock <= 0) return 'empty';
    if (stock <= minimum) return 'critical';
    if (stock <= minimum * 1.5) return 'low';
    return 'ok';
  }

  statusLabel(stock: number, minimum: number): string {
    return { ok: 'Disponible', low: 'Stock bajo', critical: 'Crítico', empty: 'Agotado' }[this.stockStatus(stock, minimum)];
  }

  exportCsv(): void {
    const header = ['Producto','Categoría','Proveedor','Stock','Unidad','Costo unitario','Valor total','Estado','Actualizado'];
    const rows = this.items().map(p => [p.name,p.category,p.supplierName ?? '',p.currentStock,p.unit,p.currentPrice,p.currentStock*p.currentPrice,this.statusLabel(p.currentStock,p.minStock),new Date(p.lastUpdated).toLocaleString('es-DO')]);
    const csv = [header, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `cierre-inventario-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
