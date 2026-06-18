import { Component, computed, signal, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterModule],
  template: `
    <div class="reports animate-fade-in-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">assessment</mat-icon> Reportes y Análisis</h1>
          <p>Visualiza el rendimiento y estado de tu inventario</p>
        </div>
        <div class="date-filter">
          @for (range of dateRanges; track range.value) {
            <button class="range-btn"
                    [class.active]="selectedRange() === range.value"
                    (click)="setRange(range.value)"
                    [id]="'range-' + range.value">
              {{ range.label }}
            </button>
          }
        </div>
      </div>

      <!-- KPI Summary -->
      <div class="kpi-row stagger-children">
        <div class="kpi-card animate-fade-in-up" id="kpi-inv-value">
          <div class="kpi-icon-wrap kpi-emerald"><mat-icon>account_balance_wallet</mat-icon></div>
          <div class="kpi-info">
            <span class="kpi-value">\${{ inventoryValue().toFixed(2) }}</span>
            <span class="kpi-label">Valor del Inventario</span>
          </div>
        </div>
        <div class="kpi-card animate-fade-in-up" id="kpi-total-preps">
          <div class="kpi-icon-wrap kpi-blue"><mat-icon>restaurant</mat-icon></div>
          <div class="kpi-info">
            <span class="kpi-value">{{ totalPreparations() }}</span>
            <span class="kpi-label">Preparaciones</span>
          </div>
        </div>
        <div class="kpi-card animate-fade-in-up" id="kpi-avg-cost">
          <div class="kpi-icon-wrap kpi-amber"><mat-icon>price_check</mat-icon></div>
          <div class="kpi-info">
            <span class="kpi-value">\${{ avgCostPerPrep().toFixed(2) }}</span>
            <span class="kpi-label">Costo Promedio / Prep</span>
          </div>
        </div>
        <div class="kpi-card animate-fade-in-up" id="kpi-low-stock">
          <div class="kpi-icon-wrap kpi-rose"><mat-icon>trending_down</mat-icon></div>
          <div class="kpi-info">
            <span class="kpi-value">{{ lowStockCount() }}</span>
            <span class="kpi-label">Productos Bajo Stock</span>
          </div>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="charts-grid">
        <!-- Price Trends -->
        <div class="chart-card chart-wide animate-fade-in-up" id="chart-price-trends">
          <div class="chart-header">
            <h3><mat-icon>show_chart</mat-icon> Tendencia de Precios</h3>
            <span class="chart-subtitle">Top 5 productos · últimos {{ getRangeDays() }} días</span>
          </div>
          <div class="chart-body">
            <canvas #priceChart></canvas>
          </div>
        </div>

        <!-- Preparations by Recipe -->
        <div class="chart-card animate-fade-in-up" id="chart-preps">
          <div class="chart-header">
            <h3><mat-icon>bar_chart</mat-icon> Preparaciones por Receta</h3>
          </div>
          <div class="chart-body">
            <canvas #prepsChart></canvas>
          </div>
        </div>

        <!-- Inventory Distribution -->
        <div class="chart-card animate-fade-in-up" id="chart-distribution">
          <div class="chart-header">
            <h3><mat-icon>donut_large</mat-icon> Distribución por Categoría</h3>
          </div>
          <div class="chart-body chart-body-donut">
            <canvas #distributionChart></canvas>
          </div>
        </div>

        <!-- Low Stock Products -->
        <div class="chart-card chart-wide animate-fade-in-up" id="chart-low-stock">
          <div class="chart-header">
            <h3><mat-icon>warning</mat-icon> Productos con Stock Más Bajo</h3>
            <span class="chart-subtitle">Stock actual vs mínimo requerido</span>
          </div>
          <div class="chart-body">
            <canvas #lowStockChart></canvas>
          </div>
        </div>
      </div>

      <!-- Activity Table -->
      <div class="activity-section animate-fade-in-up">
        <div class="section-header">
          <h3><mat-icon>history</mat-icon> Actividad Reciente</h3>
          <a routerLink="/recipes" class="view-all-link">Ver todo →</a>
        </div>
        <div class="activity-table">
          <div class="activity-header-row">
            <span class="ath">Fecha</span>
            <span class="ath">Receta</span>
            <span class="ath">Preparado por</span>
            <span class="ath ath-right">Cantidad</span>
            <span class="ath ath-right">Costo Total</span>
          </div>
          @if (recentLogs().length === 0) {
            <div class="activity-empty">
              <mat-icon>restaurant</mat-icon>
              <p>No hay preparaciones en este período</p>
            </div>
          } @else {
            @for (log of recentLogs(); track log.id) {
              <div class="activity-row">
                <span class="atd">{{ formatDate(log.preparedAt) }}</span>
                <span class="atd atd-name">
                  <span class="recipe-dot"></span>
                  {{ log.recipeName }}
                </span>
                <span class="atd">{{ log.preparedBy }}</span>
                <span class="atd atd-right">
                  <span class="qty-badge">x{{ log.quantity }}</span>
                </span>
                <span class="atd atd-right atd-cost">\${{ log.totalCost.toFixed(2) }}</span>
              </div>
            }
          }
        </div>
      </div>

      <!-- Price Stats -->
      <div class="stats-footer stagger-children animate-fade-in-up">
        <div class="stat-highlight" id="stat-highest-var">
          <div class="stat-hl-icon"><mat-icon>trending_up</mat-icon></div>
          <div class="stat-hl-content">
            <span class="stat-hl-value">{{ highestVariationProduct() }}</span>
            <span class="stat-hl-label">Mayor Variación de Precio</span>
          </div>
        </div>
        <div class="stat-highlight" id="stat-avg-price">
          <div class="stat-hl-icon stat-hl-blue"><mat-icon>analytics</mat-icon></div>
          <div class="stat-hl-content">
            <span class="stat-hl-value">\${{ avgProductPrice().toFixed(2) }}</span>
            <span class="stat-hl-label">Precio Promedio General</span>
          </div>
        </div>
        <div class="stat-highlight" id="stat-total-cats">
          <div class="stat-hl-icon stat-hl-purple"><mat-icon>category</mat-icon></div>
          <div class="stat-hl-content">
            <span class="stat-hl-value">{{ categoriesCount() }}</span>
            <span class="stat-hl-label">Categorías Activas</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reports {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* ---- Header ---- */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .page-header h1 {
      font-family: var(--pc-font-heading);
      font-size: 1.8rem;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--pc-yellow);
    }

    .page-header p {
      color: var(--pc-text-muted);
      font-size: 0.9rem;
    }

    .date-filter {
      display: flex;
      gap: 4px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-sm);
      padding: 3px;
    }

    .range-btn {
      padding: 6px 16px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--pc-text-secondary);
      font-size: 0.82rem;
      font-family: var(--pc-font-body);
      font-weight: 500;
      cursor: pointer;
      transition: all var(--pc-transition-fast);
    }

    .range-btn:hover {
      background: rgba(255, 255, 255, 0.06);
      color: var(--pc-text-primary);
    }

    .range-btn.active {
      background: var(--pc-yellow);
      color: #1A1A2E;
      font-weight: 700;
    }

    /* ---- KPI Row ---- */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.8), rgba(26, 26, 46, 0.6));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all var(--pc-transition-normal);
    }

    .kpi-card:hover {
      border-color: var(--pc-border-active);
      transform: translateY(-2px);
      box-shadow: var(--pc-shadow-glow);
    }

    .kpi-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: var(--pc-radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .kpi-icon-wrap mat-icon { color: white; font-size: 24px; }
    .kpi-emerald { background: linear-gradient(135deg, #10B981, #059669); }
    .kpi-blue { background: linear-gradient(135deg, #3B82F6, #2563EB); }
    .kpi-amber { background: linear-gradient(135deg, #F59E0B, #D97706); }
    .kpi-rose { background: linear-gradient(135deg, #F43F5E, #E11D48); }

    .kpi-info { display: flex; flex-direction: column; }

    .kpi-value {
      font-family: var(--pc-font-heading);
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--pc-text-primary);
      line-height: 1;
    }

    .kpi-label {
      font-size: 0.78rem;
      color: var(--pc-text-muted);
      margin-top: 4px;
    }

    /* ---- Charts Grid ---- */
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }

    .chart-card {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      overflow: hidden;
      transition: border-color var(--pc-transition-normal);
    }

    .chart-card:hover { border-color: var(--pc-border-active); }
    .chart-wide { grid-column: 1 / -1; }

    .chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--pc-border);
    }

    .chart-header h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      font-family: var(--pc-font-heading);
    }

    .chart-header h3 mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--pc-yellow);
    }

    .chart-subtitle {
      font-size: 0.78rem;
      color: var(--pc-text-muted);
    }

    .chart-body {
      padding: 20px;
      height: 280px;
      position: relative;
    }

    .chart-body-donut {
      height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .chart-body canvas {
      width: 100% !important;
      height: 100% !important;
    }

    /* ---- Activity Table ---- */
    .activity-section {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      overflow: hidden;
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--pc-border);
    }

    .section-header h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      font-family: var(--pc-font-heading);
    }

    .section-header h3 mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--pc-yellow);
    }

    .view-all-link {
      color: var(--pc-yellow);
      text-decoration: none;
      font-size: 0.82rem;
      font-weight: 500;
      transition: opacity var(--pc-transition-fast);
    }

    .view-all-link:hover { opacity: 0.8; }

    .activity-header-row {
      display: grid;
      grid-template-columns: 1.2fr 1.5fr 1fr 0.7fr 0.8fr;
      padding: 12px 20px;
      background: rgba(0, 0, 0, 0.2);
    }

    .ath {
      font-size: 0.72rem;
      color: var(--pc-text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .ath-right { text-align: right; }

    .activity-row {
      display: grid;
      grid-template-columns: 1.2fr 1.5fr 1fr 0.7fr 0.8fr;
      padding: 12px 20px;
      border-bottom: 1px solid var(--pc-border);
      align-items: center;
      transition: background var(--pc-transition-fast);
    }

    .activity-row:last-child { border-bottom: none; }
    .activity-row:hover { background: rgba(255, 255, 255, 0.02); }

    .atd { font-size: 0.88rem; color: var(--pc-text-secondary); }
    .atd-right { text-align: right; }

    .atd-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: var(--pc-text-primary);
    }

    .recipe-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--pc-yellow);
      flex-shrink: 0;
    }

    .qty-badge {
      background: rgba(242, 201, 76, 0.12);
      color: var(--pc-yellow);
      padding: 2px 10px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.82rem;
    }

    .atd-cost {
      font-weight: 700;
      color: var(--pc-text-primary);
    }

    .activity-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
      gap: 8px;
    }

    .activity-empty mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      opacity: 0.3;
    }

    .activity-empty p {
      color: var(--pc-text-muted);
      font-size: 0.88rem;
    }

    /* ---- Stats Footer ---- */
    .stats-footer {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .stat-highlight {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all var(--pc-transition-normal);
    }

    .stat-highlight:hover {
      border-color: var(--pc-border-active);
      transform: translateY(-2px);
    }

    .stat-hl-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--pc-radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(242, 201, 76, 0.12);
      flex-shrink: 0;
    }

    .stat-hl-icon mat-icon {
      color: var(--pc-yellow);
      font-size: 22px;
    }

    .stat-hl-blue {
      background: rgba(59, 130, 246, 0.12);
    }

    .stat-hl-blue mat-icon { color: #60A5FA; }

    .stat-hl-purple {
      background: rgba(124, 58, 237, 0.12);
    }

    .stat-hl-purple mat-icon { color: #A78BFA; }

    .stat-hl-content { display: flex; flex-direction: column; }

    .stat-hl-value {
      font-family: var(--pc-font-heading);
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--pc-text-primary);
    }

    .stat-hl-label {
      font-size: 0.76rem;
      color: var(--pc-text-muted);
      margin-top: 2px;
    }

    /* ---- Responsive ---- */
    @media (max-width: 1024px) {
      .kpi-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .charts-grid {
        grid-template-columns: 1fr;
      }

      .chart-wide {
        grid-column: 1;
      }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
      }

      .kpi-row {
        grid-template-columns: 1fr 1fr;
      }

      .stats-footer {
        grid-template-columns: 1fr;
      }

      .activity-header-row, .activity-row {
        grid-template-columns: 1fr 1.5fr 0.7fr;
      }

      .activity-header-row .ath:nth-child(3),
      .activity-header-row .ath:nth-child(5),
      .activity-row .atd:nth-child(3),
      .activity-row .atd:nth-child(5) {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .kpi-row { grid-template-columns: 1fr; }
      .date-filter { flex-wrap: wrap; }
    }
  `],
})
export class ReportsDashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('priceChart') priceChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('prepsChart') prepsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('distributionChart') distributionChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lowStockChart') lowStockChartRef!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];

  selectedRange = signal<string>('30d');

  dateRanges = [
    { value: '7d', label: '7 días' },
    { value: '30d', label: '30 días' },
    { value: '90d', label: '90 días' },
    { value: 'all', label: 'Todo' },
  ];

  constructor(
    public auth: AuthService,
    private dataService: DataService
  ) {}

  // --- Computed KPIs ---
  inventoryValue = computed(() =>
    this.dataService.products().reduce((sum, p) => sum + p.currentStock * p.currentPrice, 0)
  );

  totalPreparations = computed(() => {
    const logs = this.getFilteredLogs();
    return logs.length;
  });

  avgCostPerPrep = computed(() => {
    const logs = this.getFilteredLogs();
    if (logs.length === 0) return 0;
    const totalCost = logs.reduce((sum, l) => sum + l.totalCost, 0);
    return totalCost / logs.length;
  });

  lowStockCount = computed(() => this.dataService.lowStockProducts().length);

  recentLogs = computed(() => this.getFilteredLogs().slice(0, 10));

  highestVariationProduct = computed(() => {
    const products = this.dataService.products();
    if (products.length === 0) return 'N/A';

    let maxVar = 0;
    let maxName = products[0]?.name || 'N/A';

    for (const product of products) {
      const history = this.dataService.getPriceHistory(product.id);
      if (history.length < 2) continue;
      const prices = history.map(h => h.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const variation = min > 0 ? ((max - min) / min) * 100 : 0;
      if (variation > maxVar) {
        maxVar = variation;
        maxName = product.name;
      }
    }

    return maxName;
  });

  avgProductPrice = computed(() => {
    const products = this.dataService.products();
    if (products.length === 0) return 0;
    return products.reduce((sum, p) => sum + p.currentPrice, 0) / products.length;
  });

  categoriesCount = computed(() => {
    const cats = new Set(this.dataService.products().map(p => p.category));
    return cats.size;
  });

  ngAfterViewInit(): void {
    setTimeout(() => this.buildCharts(), 100);
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  setRange(value: string): void {
    this.selectedRange.set(value);
    this.rebuildCharts();
  }

  getRangeDays(): number {
    const map: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, 'all': 365 };
    return map[this.selectedRange()] || 30;
  }

  private getFilteredLogs() {
    const days = this.getRangeDays();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return this.dataService.recipeLogs().filter(l => new Date(l.preparedAt) >= cutoff);
  }

  private rebuildCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
    this.buildCharts();
  }

  private buildCharts(): void {
    this.buildPriceChart();
    this.buildPrepsChart();
    this.buildDistributionChart();
    this.buildLowStockChart();
  }

  private buildPriceChart(): void {
    const ctx = this.priceChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const products = this.dataService.products().slice(0, 5);
    const days = this.getRangeDays();
    const colors = ['#F2C94C', '#3B82F6', '#10B981', '#F43F5E', '#A78BFA'];

    const datasets = products.map((product, i) => {
      const history = this.dataService.getPriceHistory(product.id)
        .filter(h => {
          const d = new Date(h.recordedAt);
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          return d >= cutoff;
        })
        .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

      return {
        label: product.name,
        data: history.map(h => h.price),
        borderColor: colors[i],
        backgroundColor: colors[i] + '15',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
      };
    });

    const longestHistory = products.reduce((max, p) => {
      const h = this.dataService.getPriceHistory(p.id)
        .filter(h => {
          const d = new Date(h.recordedAt);
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          return d >= cutoff;
        })
        .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
      return h.length > max.length ? h : max;
    }, [] as any[]);

    const labels = longestHistory.map((h: any) =>
      new Date(h.recordedAt).toLocaleDateString('es', { month: 'short', day: 'numeric' })
    );

    const chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#B0B0C3', font: { size: 11 }, padding: 16, usePointStyle: true, pointStyle: 'circle' }
          }
        },
        scales: {
          x: { ticks: { color: '#6C6C80', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#6C6C80', font: { size: 10 }, callback: (v) => '$' + v }, grid: { color: 'rgba(255,255,255,0.04)' } }
        },
        interaction: { intersect: false, mode: 'index' }
      }
    });
    this.charts.push(chart);
  }

  private buildPrepsChart(): void {
    const ctx = this.prepsChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const logs = this.getFilteredLogs();
    const recipeMap = new Map<string, number>();
    logs.forEach(l => {
      recipeMap.set(l.recipeName, (recipeMap.get(l.recipeName) || 0) + l.quantity);
    });

    const labels = Array.from(recipeMap.keys());
    const data = Array.from(recipeMap.values());
    const colors = ['#F2C94C', '#3B82F6', '#10B981', '#F43F5E', '#A78BFA', '#FB923C'];

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Preparaciones',
          data,
          backgroundColor: labels.map((_, i) => colors[i % colors.length] + 'CC'),
          borderColor: labels.map((_, i) => colors[i % colors.length]),
          borderWidth: 1,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: '#6C6C80', font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: '#6C6C80', font: { size: 10 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
      }
    });
    this.charts.push(chart);
  }

  private buildDistributionChart(): void {
    const ctx = this.distributionChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const catMap = new Map<string, number>();
    const catLabels: Record<string, string> = {
      pollo: '🍗 Pollo',
      insumos: '🧂 Insumos',
      empaque: '📦 Empaque',
      limpieza: '🧹 Limpieza',
      otro: '📋 Otro'
    };

    this.dataService.products().forEach(p => {
      const label = catLabels[p.category] || p.category;
      catMap.set(label, (catMap.get(label) || 0) + p.currentStock);
    });

    const labels = Array.from(catMap.keys());
    const data = Array.from(catMap.values());
    const colors = ['#F2C94C', '#3B82F6', '#A78BFA', '#10B981', '#6C6C80'];

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: '#16213E',
          borderWidth: 3,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#B0B0C3', font: { size: 11 }, padding: 16, usePointStyle: true, pointStyle: 'circle' }
          }
        }
      }
    });
    this.charts.push(chart);
  }

  private buildLowStockChart(): void {
    const ctx = this.lowStockChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const products = [...this.dataService.products()]
      .sort((a, b) => (a.currentStock / Math.max(a.minStock, 1)) - (b.currentStock / Math.max(b.minStock, 1)))
      .slice(0, 8);

    const labels = products.map(p => p.name);
    const currentData = products.map(p => p.currentStock);
    const minData = products.map(p => p.minStock);

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Stock Actual',
            data: currentData,
            backgroundColor: currentData.map((v, i) =>
              v <= minData[i] * 0.5 ? '#E5393580' : v <= minData[i] ? '#FB8C0080' : '#43A04780'
            ),
            borderColor: currentData.map((v, i) =>
              v <= minData[i] * 0.5 ? '#E53935' : v <= minData[i] ? '#FB8C00' : '#43A047'
            ),
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Stock Mínimo',
            data: minData,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            borderRadius: 4,
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#B0B0C3', font: { size: 11 }, padding: 16, usePointStyle: true, pointStyle: 'rect' }
          }
        },
        scales: {
          x: { ticks: { color: '#6C6C80', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#B0B0C3', font: { size: 11 } }, grid: { display: false } }
        }
      }
    });
    this.charts.push(chart);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('es', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
