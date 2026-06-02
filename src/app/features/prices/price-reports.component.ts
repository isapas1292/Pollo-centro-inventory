import { Component, computed, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../../core/services/data.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-price-reports',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">show_chart</mat-icon> Reportes de Aumento de Precios</h1>
          <p>Analiza el historial de inflación y cambios en el costo de productos</p>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-bar stagger-children">
        <div class="stat-card animate-fade-in-up">
          <div class="stat-icon s-red"><mat-icon>trending_up</mat-icon></div>
          <div class="stat-info">
            <span class="stat-val">+{{ averageIncreasePercent().toFixed(1) }}%</span>
            <span class="stat-lbl">Inflación Promedio</span>
          </div>
        </div>
        <div class="stat-card animate-fade-in-up">
          <div class="stat-icon s-orange"><mat-icon>warning</mat-icon></div>
          <div class="stat-info">
            <span class="stat-val">{{ highestIncreaseProduct()?.productName || 'N/A' }}</span>
            <span class="stat-lbl">Mayor Aumento Histórico</span>
          </div>
        </div>
        <div class="stat-card animate-fade-in-up">
          <div class="stat-icon s-blue"><mat-icon>history</mat-icon></div>
          <div class="stat-info">
            <span class="stat-val">{{ totalChanges() }}</span>
            <span class="stat-lbl">Cambios Registrados</span>
          </div>
        </div>
      </div>

      <!-- Chart and Table Layout -->
      <div class="reports-layout">
        
        <!-- Left: Chart -->
        <div class="chart-section animate-fade-in-up">
          <div class="section-header">
            <h3><mat-icon>bar_chart</mat-icon> Productos con más aumentos (Top 5)</h3>
          </div>
          <div class="chart-container">
            <canvas #priceChart></canvas>
          </div>
        </div>

        <!-- Right: Recent changes list -->
        <div class="list-section animate-fade-in-up">
          <div class="section-header">
            <h3><mat-icon>list_alt</mat-icon> Cambios Recientes</h3>
          </div>
          <div class="changes-list">
            @for (record of recentChanges(); track record.id) {
              <div class="change-card">
                <div class="change-info">
                  <span class="change-name">{{ record.productName }}</span>
                  <span class="change-date">{{ record.recordedAt | date:'mediumDate' }}</span>
                </div>
                <div class="change-price text-right">
                  <div class="new-price">\${{ record.price.toFixed(2) }}</div>
                  @if (getPreviousPrice(record.productId, record.recordedAt)) {
                    <div class="old-price" [class.increased]="record.price > getPreviousPrice(record.productId, record.recordedAt)!"
                                           [class.decreased]="record.price < getPreviousPrice(record.productId, record.recordedAt)!">
                      <mat-icon>{{ record.price > getPreviousPrice(record.productId, record.recordedAt)! ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                      vs \${{ getPreviousPrice(record.productId, record.recordedAt)!.toFixed(2) }}
                    </div>
                  }
                </div>
              </div>
            }
            @if (recentChanges().length === 0) {
              <div class="empty-state">
                No hay registros de cambios de precio.
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; padding-bottom: 40px; }
    
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 24px;
    }
    
    .header-text h1 { font-family: var(--pc-font-heading); font-size: 1.8rem; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; color: var(--pc-text-primary); }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: var(--pc-yellow); }
    .header-text p { color: var(--pc-text-muted); font-size: 0.9rem; }

    /* Stats */
    .stats-bar { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg);
      padding: 16px 20px; display: flex; align-items: center; gap: 16px;
    }
    .stat-icon { width: 44px; height: 44px; border-radius: var(--pc-radius-md); display: flex; align-items: center; justify-content: center; }
    .stat-icon mat-icon { color: white; }
    .s-red { background: linear-gradient(135deg, #EF4444, #B91C1C); }
    .s-orange { background: linear-gradient(135deg, #F59E0B, #D97706); }
    .s-blue { background: linear-gradient(135deg, #3B82F6, #2563EB); }
    
    .stat-info { display: flex; flex-direction: column; overflow: hidden; }
    .stat-val { font-size: 1.4rem; font-weight: 700; font-family: var(--pc-font-heading); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--pc-text-primary); }
    .stat-lbl { font-size: 0.75rem; color: var(--pc-text-muted); }

    /* Layout */
    .reports-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }

    .section-header { margin-bottom: 16px; border-bottom: 1px solid var(--pc-border); padding-bottom: 8px; }
    .section-header h3 { font-size: 1.1rem; color: var(--pc-text-primary); display: flex; align-items: center; gap: 8px; }
    .section-header mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--pc-yellow); }

    /* Chart */
    .chart-section {
      background: rgba(22, 33, 62, 0.4); border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg); padding: 20px;
    }
    .chart-container { position: relative; height: 400px; width: 100%; }

    /* List */
    .list-section {
      background: rgba(22, 33, 62, 0.4); border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg); padding: 20px; display: flex; flex-direction: column;
    }
    
    .changes-list { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; max-height: 400px; padding-right: 8px; }
    
    .change-card {
      background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05);
      border-radius: var(--pc-radius-md); padding: 12px 16px;
      display: flex; justify-content: space-between; align-items: center;
      transition: background 0.2s;
    }
    .change-card:hover { background: rgba(0,0,0,0.3); }

    .change-info { display: flex; flex-direction: column; gap: 4px; }
    .change-name { font-weight: 600; font-size: 0.95rem; color: var(--pc-text-primary); }
    .change-date { font-size: 0.75rem; color: var(--pc-text-muted); }

    .text-right { text-align: right; }
    .new-price { font-size: 1.1rem; font-weight: 700; color: var(--pc-text-primary); }
    
    .old-price { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; font-weight: 600; justify-content: flex-end; }
    .old-price mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .increased { color: #EF4444; }
    .decreased { color: #10B981; }

    .empty-state { padding: 32px; text-align: center; color: var(--pc-text-muted); font-size: 0.9rem; }

    @media (max-width: 900px) {
      .reports-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class PriceReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('priceChart') priceChartRef!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | null = null;

  // Raw history
  private history = computed(() => this.dataService.priceHistory());

  constructor(private dataService: DataService) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.renderChart();
  }

  ngOnDestroy() {
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
  }

  // --- Computed ---
  
  totalChanges = computed(() => this.history().length);

  recentChanges = computed(() => {
    return [...this.history()].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()).slice(0, 15);
  });

  averageIncreasePercent = computed(() => {
    // A simplified metric: average % change among the latest changes
    const changes = this.recentChanges();
    if (changes.length === 0) return 0;
    
    let totalPercent = 0;
    let count = 0;

    for (const record of changes) {
      const prev = this.getPreviousPrice(record.productId, record.recordedAt);
      if (prev && prev > 0) {
        const percent = ((record.price - prev) / prev) * 100;
        totalPercent += percent;
        count++;
      }
    }

    return count > 0 ? totalPercent / count : 0;
  });

  highestIncreaseProduct = computed(() => {
    const changes = this.history();
    if (changes.length === 0) return null;

    let maxIncrease = 0;
    let maxProduct = null;

    for (const record of changes) {
      const prev = this.getPreviousPrice(record.productId, record.recordedAt);
      if (prev && prev > 0) {
        const diff = record.price - prev;
        if (diff > maxIncrease) {
          maxIncrease = diff;
          maxProduct = record;
        }
      }
    }

    return maxProduct;
  });

  // --- Helper Methods ---

  getPreviousPrice(productId: string, currentDate: Date): number | null {
    const allForProduct = this.history()
      .filter(h => h.productId === productId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

    // Find the first record that is older than the current date
    const targetTime = new Date(currentDate).getTime();
    for (const h of allForProduct) {
      if (new Date(h.recordedAt).getTime() < targetTime) {
        return h.price;
      }
    }
    return null;
  }

  // --- Chart Logic ---

  private renderChart() {
    if (!this.priceChartRef) return;
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const changes = this.history();
    if (changes.length === 0) return;

    // Aggregate increases by product
    const increaseMap: Record<string, number> = {};
    const nameMap: Record<string, string> = {};

    for (const record of changes) {
      const prev = this.getPreviousPrice(record.productId, record.recordedAt);
      if (prev && prev > 0 && record.price > prev) {
        increaseMap[record.productId] = (increaseMap[record.productId] || 0) + (record.price - prev);
        nameMap[record.productId] = record.productName || 'Desconocido';
      }
    }

    // Sort to get top 5
    const topIncreases = Object.keys(increaseMap)
      .map(id => ({ id, name: nameMap[id], totalIncrease: increaseMap[id] }))
      .sort((a, b) => b.totalIncrease - a.totalIncrease)
      .slice(0, 5);

    if (topIncreases.length === 0) return;

    const ctx = this.priceChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    Chart.defaults.color = '#94A3B8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: topIncreases.map(t => t.name),
        datasets: [{
          label: 'Aumento Total Acumulado ($)',
          data: topIncreases.map(t => t.totalIncrease),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: '#EF4444',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }
}
