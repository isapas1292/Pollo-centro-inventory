import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../../core/services/data.service';

interface InventoryMovement {
  id: string;
  date: Date | string;
  type: 'entrada' | 'consumo' | 'envio';
  product: string;
  quantity: number;
  unit: string;
  source: string;
  counterpart: string;
  actor: string;
}

@Component({
  selector: 'app-inventory-activity',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="report-page animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1><mat-icon>history</mat-icon> Actividad de Inventario</h1>
          <p>Entradas, consumos y envíos registrados en el sistema.</p>
        </div>
        <button class="btn-primary" (click)="printReport()"><mat-icon>print</mat-icon> Imprimir reporte</button>
      </div>

      <div class="kpi-grid">
        <div class="kpi"><span>Movimientos</span><strong>{{ movements().length }}</strong></div>
        <div class="kpi entry"><span>Entradas</span><strong>+{{ entryQuantity() | number:'1.0-2' }}</strong></div>
        <div class="kpi consumption"><span>Consumo</span><strong>-{{ consumedQuantity() | number:'1.0-2' }}</strong></div>
        <div class="kpi dispatch"><span>Envíos</span><strong>-{{ dispatchedQuantity() | number:'1.0-2' }}</strong></div>
      </div>

      <div class="filters-row">
        <label><span>Desde</span><input type="date" [ngModel]="fromDate()" (ngModelChange)="fromDate.set($event)"></label>
        <label><span>Hasta</span><input type="date" [ngModel]="toDate()" (ngModelChange)="toDate.set($event)"></label>
        <select [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)">
          <option value="all">Todos los movimientos</option>
          <option value="entrada">Entradas</option><option value="consumo">Consumos</option><option value="envio">Envíos</option>
        </select>
        <div class="search-box"><mat-icon>search</mat-icon><input type="search" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Buscar producto, proveedor o local"></div>
        @if (fromDate() || toDate() || typeFilter() !== 'all' || search()) {
          <button class="icon-btn" (click)="clearFilters()" title="Limpiar filtros"><mat-icon>close</mat-icon></button>
        }
      </div>

      <div class="table-card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th class="right">Cantidad</th><th>Origen</th><th>Proveedor / Local / Receta</th><th>Registrado por</th></tr></thead>
            <tbody>
              @for (item of movements(); track item.id) {
                <tr>
                  <td>{{ item.date | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td><span class="movement" [attr.data-type]="item.type">{{ typeLabel(item.type) }}</span></td>
                  <td class="name">{{ item.product }}</td>
                  <td class="right quantity" [class.positive]="item.quantity > 0" [class.negative]="item.quantity < 0">{{ item.quantity > 0 ? '+' : '' }}{{ item.quantity | number:'1.0-2' }} {{ item.unit }}</td>
                  <td>{{ item.source }}</td><td>{{ item.counterpart }}</td><td>{{ item.actor || 'Sistema' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="empty">No hay actividad que coincida con los filtros.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .report-page { max-width:1400px; margin:0 auto; padding:16px 16px 40px; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:20px; }
    h1 { display:flex; align-items:center; gap:10px; font-family:var(--pc-font-heading); font-size:1.8rem; margin-bottom:4px; }
    h1 mat-icon { color:var(--pc-yellow); } p { color:var(--pc-text-muted); font-size:.9rem; }
    .btn-primary { display:flex; align-items:center; gap:8px; background:var(--pc-yellow); color:#1A1A2E; border:0; padding:10px 18px; border-radius:var(--pc-radius-md); font-weight:700; cursor:pointer; }
    .kpi-grid { display:grid; grid-template-columns:repeat(4,minmax(150px,1fr)); gap:12px; margin-bottom:18px; }
    .kpi { padding:16px; border:1px solid var(--pc-border); background:rgba(22,33,62,.55); border-radius:var(--pc-radius-md); display:flex; flex-direction:column; gap:5px; }
    .kpi span { color:var(--pc-text-muted); font-size:.76rem; text-transform:uppercase; } .kpi strong { font-family:var(--pc-font-heading); font-size:1.25rem; }
    .kpi.entry strong { color:#34D399; } .kpi.consumption strong { color:#FBBF24; } .kpi.dispatch strong { color:#F87171; }
    .filters-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
    .filters-row label { display:flex; align-items:center; gap:7px; padding:0 10px; height:40px; border:1px solid var(--pc-border); background:rgba(0,0,0,.2); border-radius:var(--pc-radius-md); }
    .filters-row label span { color:var(--pc-text-muted); font-size:.76rem; }
    input,select { height:40px; border:1px solid var(--pc-border); background:rgba(0,0,0,.2); color:var(--pc-text-primary); border-radius:var(--pc-radius-md); padding:0 12px; font-family:var(--pc-font-body); color-scheme:dark; }
    label input { border:0; background:transparent; padding:0; } select { min-width:190px; } select option { background:var(--pc-bg-sidebar); }
    input:focus,select:focus { outline:none; border-color:var(--pc-yellow); }
    .search-box { position:relative; flex:1; min-width:260px; max-width:430px; } .search-box input { width:100%; padding-left:38px; }
    .search-box mat-icon { position:absolute; left:11px; top:10px; color:var(--pc-text-muted); font-size:19px; }
    .icon-btn { width:40px; height:40px; display:flex; align-items:center; justify-content:center; border:1px solid var(--pc-border); background:rgba(255,255,255,.04); color:var(--pc-text-secondary); border-radius:var(--pc-radius-md); cursor:pointer; }
    .table-card { border:1px solid var(--pc-border); background:rgba(22,33,62,.5); border-radius:var(--pc-radius-lg); overflow:hidden; }
    .table-wrap { overflow:auto; } table { width:100%; min-width:1050px; border-collapse:collapse; }
    th { padding:12px 14px; text-align:left; background:rgba(0,0,0,.35); color:var(--pc-text-muted); font-size:.72rem; text-transform:uppercase; }
    td { padding:12px 14px; border-top:1px solid var(--pc-border); font-size:.84rem; color:var(--pc-text-secondary); }
    tr:hover td { background:rgba(255,255,255,.025); } .name { color:var(--pc-text-primary); font-weight:600; } .right { text-align:right; }
    .quantity { white-space:nowrap; font-weight:700; } .positive { color:#34D399; } .negative { color:#F87171; }
    .movement { display:inline-block; padding:3px 8px; border-radius:4px; font-size:.7rem; font-weight:700; }
    .movement[data-type="entrada"] { color:#34D399; background:rgba(16,185,129,.12); }
    .movement[data-type="consumo"] { color:#FBBF24; background:rgba(245,158,11,.12); }
    .movement[data-type="envio"] { color:#F87171; background:rgba(239,68,68,.12); }
    .empty { text-align:center; padding:34px; color:var(--pc-text-muted); }
    @media(max-width:800px){ .kpi-grid{grid-template-columns:repeat(2,1fr);} }
    @media print { .page-header button,.filters-row { display:none!important; } .report-page { max-width:none; padding:0; } .table-card { border-color:#bbb; } }
  `]
})
export class InventoryActivityComponent {
  private data = inject(DataService);
  fromDate = signal('');
  toDate = signal('');
  typeFilter = signal<InventoryMovement['type'] | 'all'>('all');
  search = signal('');

  private allMovements = computed<InventoryMovement[]>(() => {
    const productUnits = new Map(this.data.products().map(p => [p.id, p.unit]));
    const entries = this.data.orderReceptions()
      .filter(r => r.status === 'completed')
      .map(r => ({ id:`reception-${r.id}`, date:r.receivedAt, type:'entrada' as const, product:r.productName, quantity:r.quantity, unit:productUnits.get(r.productId) ?? 'unidad', source:'Recepción', counterpart:r.supplierName, actor:r.receivedBy }));
    const consumptions = this.data.recipeLogs().flatMap(log => log.ingredientsUsed.map((item, index) => ({
      id:`preparation-${log.id}-${index}`, date:log.preparedAt, type:'consumo' as const, product:item.productName,
      quantity:-item.quantity, unit:productUnits.get(item.productId) ?? 'unidad', source:'Preparación', counterpart:log.recipeName, actor:log.preparedBy
    })));
    const dispatches = this.data.dispatches().flatMap(dispatch => dispatch.items.map((item, index) => ({
      id:`dispatch-${dispatch.id}-${index}`, date:dispatch.createdAt, type:'envio' as const, product:item.name,
      quantity:-item.quantity, unit:item.unit ?? (item.type === 'ingrediente' ? productUnits.get(item.refId) ?? 'unidad' : 'unidad'),
      source:item.type === 'receta' ? 'Envío de receta' : 'Envío de inventario', counterpart:dispatch.locationName, actor:dispatch.dispatchedBy
    })));
    return [...entries, ...consumptions, ...dispatches].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  movements = computed(() => {
    const term = this.search().trim().toLowerCase();
    const from = this.fromDate() ? new Date(`${this.fromDate()}T00:00:00`).getTime() : -Infinity;
    const to = this.toDate() ? new Date(`${this.toDate()}T23:59:59.999`).getTime() : Infinity;
    return this.allMovements().filter(item => {
      const time = new Date(item.date).getTime();
      const matches = !term || [item.product,item.source,item.counterpart,item.actor].some(value => value.toLowerCase().includes(term));
      return time >= from && time <= to && matches && (this.typeFilter() === 'all' || item.type === this.typeFilter());
    });
  });
  entryQuantity = computed(() => this.movements().filter(x => x.type === 'entrada').reduce((sum,x) => sum + x.quantity, 0));
  consumedQuantity = computed(() => Math.abs(this.movements().filter(x => x.type === 'consumo').reduce((sum,x) => sum + x.quantity, 0)));
  dispatchedQuantity = computed(() => Math.abs(this.movements().filter(x => x.type === 'envio').reduce((sum,x) => sum + x.quantity, 0)));

  typeLabel(type: InventoryMovement['type']): string { return { entrada:'Entrada', consumo:'Consumo', envio:'Envío' }[type]; }
  clearFilters(): void { this.fromDate.set(''); this.toDate.set(''); this.typeFilter.set('all'); this.search.set(''); }
  printReport(): void { window.print(); }
}
