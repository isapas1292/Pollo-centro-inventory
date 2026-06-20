import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../../core/services/data.service';

interface MarginRow {
  id: string;
  name: string;
  cost: number;
  price: number;
  profit: number;
  marginPct: number;
}

@Component({
  selector: 'app-margin-report',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">percent</mat-icon> Margen de Ganancia</h1>
          <p>Compara el costo de producción de cada receta con su precio de venta.</p>
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Recetas con precio</span>
          <span class="kpi-value">{{ rows().length }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Margen promedio</span>
          <span class="kpi-value" [class.pos]="avgMargin() >= 0" [class.neg]="avgMargin() < 0">{{ avgMargin().toFixed(1) }}%</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Ganancia total (por unidad)</span>
          <span class="kpi-value">RD$ {{ totalProfit() | number:'1.2-2' }}</span>
        </div>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Receta</th>
                <th class="right">Costo</th>
                <th class="right">Precio Venta</th>
                <th class="right">Ganancia</th>
                <th class="right">Margen</th>
                <th style="width:160px">Margen visual</th>
              </tr>
            </thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr>
                  <td class="name">{{ r.name }}</td>
                  <td class="right">RD$ {{ r.cost | number:'1.2-2' }}</td>
                  <td class="right">RD$ {{ r.price | number:'1.2-2' }}</td>
                  <td class="right" [class.pos]="r.profit >= 0" [class.neg]="r.profit < 0">RD$ {{ r.profit | number:'1.2-2' }}</td>
                  <td class="right">
                    <span class="pill" [class.pill-good]="r.marginPct >= 50" [class.pill-mid]="r.marginPct >= 20 && r.marginPct < 50" [class.pill-bad]="r.marginPct < 20">
                      {{ r.marginPct.toFixed(1) }}%
                    </span>
                  </td>
                  <td>
                    <div class="bar-track">
                      <div class="bar-fill" [class.good]="r.marginPct >= 50" [class.mid]="r.marginPct >= 20 && r.marginPct < 50" [class.bad]="r.marginPct < 20"
                           [style.width.%]="clamp(r.marginPct)"></div>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty">
                  No hay recetas con precio de venta. Crea una receta y asígnale un precio al consumidor.
                  <a routerLink="/recipes/create" class="link">Crear receta →</a>
                </td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <p class="hint">
        <mat-icon>info</mat-icon>
        El costo se calcula automáticamente de los ingredientes (cantidad × costo unitario). El precio de venta
        se define al crear/editar la receta. Margen = (Precio − Costo) ÷ Precio.
      </p>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1100px; margin: 0 auto; padding-bottom: 40px; }
    .page-header { margin-bottom: 22px; }
    .header-text h1 { font-family: var(--pc-font-heading); font-size: 1.8rem; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: var(--pc-yellow); }
    .header-text p { color: var(--pc-text-muted); font-size: 0.9rem; }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 22px; }
    .kpi-card { display: flex; flex-direction: column; gap: 4px; padding: 18px; border-radius: var(--pc-radius-lg); border: 1px solid var(--pc-border); background: linear-gradient(135deg, rgba(22,33,62,0.6), rgba(26,26,46,0.4)); }
    .kpi-label { font-size: 0.76rem; color: var(--pc-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-value { font-size: 1.5rem; font-weight: 700; font-family: var(--pc-font-heading); }

    .card { background: linear-gradient(135deg, rgba(22,33,62,0.6), rgba(26,26,46,0.4)); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg); padding: 8px; }
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    .data-table th { text-align: left; padding: 12px; color: var(--pc-text-muted); font-weight: 500; border-bottom: 1px solid var(--pc-border); font-size: 0.76rem; text-transform: uppercase; }
    .data-table td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .data-table .right { text-align: right; }
    .data-table .name { font-weight: 600; }
    .pos { color: #34D399; }
    .neg { color: #F87171; }

    .pill { padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; }
    .pill-good { background: rgba(16,185,129,0.15); color: #34D399; }
    .pill-mid { background: rgba(245,158,11,0.15); color: #FBBF24; }
    .pill-bad { background: rgba(239,68,68,0.15); color: #F87171; }

    .bar-track { height: 8px; background: rgba(255,255,255,0.06); border-radius: 6px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 6px; transition: width 0.4s ease; }
    .bar-fill.good { background: #34D399; }
    .bar-fill.mid { background: #FBBF24; }
    .bar-fill.bad { background: #F87171; }

    .empty { text-align: center; color: var(--pc-text-muted); padding: 40px; }
    .link { color: var(--pc-yellow); text-decoration: none; margin-left: 8px; }
    .hint { display: flex; align-items: center; gap: 8px; margin-top: 16px; color: var(--pc-text-muted); font-size: 0.82rem; }
    .hint mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `]
})
export class MarginReportComponent {
  private dataService = inject(DataService);

  rows = computed<MarginRow[]>(() =>
    this.dataService.recipes()
      .map(r => {
        const cost = r.estimatedCost ?? 0;
        const price = r.salePrice ?? 0;
        const profit = price - cost;
        return { id: r.id, name: r.name, cost, price, profit, marginPct: price > 0 ? (profit / price) * 100 : 0 };
      })
      .filter(r => r.price > 0)
      .sort((a, b) => b.marginPct - a.marginPct)
  );

  avgMargin = computed(() => {
    const rs = this.rows();
    return rs.length ? rs.reduce((s, r) => s + r.marginPct, 0) / rs.length : 0;
  });

  totalProfit = computed(() => this.rows().reduce((s, r) => s + r.profit, 0));

  clamp(pct: number): number {
    return Math.max(0, Math.min(100, pct));
  }
}
