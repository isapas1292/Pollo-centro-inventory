import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AccountingService } from '../../core/services/accounting.service';

@Component({
  selector: 'app-accounting-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">account_balance</mat-icon> Contabilidad</h1>
          <p>Resumen financiero y Estado de Resultados — Pollo Centro</p>
        </div>
        <a class="btn-primary" routerLink="/contabilidad/transacciones">
          <mat-icon>add</mat-icon> Nueva Transacción
        </a>
      </div>

      <!-- Selector de local + exportación -->
      <div class="toolbar">
        <div class="local-select">
          <mat-icon>store</mat-icon>
          <select [value]="selectedLocal()" (change)="onLocal($event)">
            <option value="all">Todos los locales (consolidado)</option>
            @for (loc of locations(); track loc.id) { <option [value]="loc.id">{{ loc.name }}</option> }
          </select>
        </div>
        <button class="btn-excel" (click)="exportExcel()">
          <mat-icon>download</mat-icon> Exportar a Excel
        </button>
      </div>

      @if (summary(); as s) {
        <!-- KPIs -->
        <div class="kpi-grid">
          <div class="kpi-card income">
            <div class="kpi-icon"><mat-icon>trending_up</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-label">Ingresos</span>
              <span class="kpi-value">RD$ {{ s.totalIncome | number:'1.0-0' }}</span>
            </div>
          </div>
          <div class="kpi-card expense">
            <div class="kpi-icon"><mat-icon>trending_down</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-label">Gastos</span>
              <span class="kpi-value">RD$ {{ s.totalExpenses | number:'1.0-0' }}</span>
            </div>
          </div>
          <div class="kpi-card" [class.income]="s.netProfit >= 0" [class.expense]="s.netProfit < 0">
            <div class="kpi-icon"><mat-icon>savings</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-label">Utilidad Neta</span>
              <span class="kpi-value">RD$ {{ s.netProfit | number:'1.0-0' }}</span>
            </div>
          </div>
          <div class="kpi-card neutral">
            <div class="kpi-icon"><mat-icon>receipt_long</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-label">Transacciones</span>
              <span class="kpi-value">{{ s.transactionCount }}</span>
            </div>
          </div>
        </div>

        <div class="columns">
          <!-- Estado de Resultados -->
          <div class="card pnl-card">
            <h3 class="card-title"><mat-icon>summarize</mat-icon> Estado de Resultados</h3>

            <div class="pnl-section-title">Ingresos</div>
            @for (row of s.incomeByAccount; track row.account) {
              <div class="pnl-row">
                <span>{{ row.account }}</span>
                <span class="pos">RD$ {{ row.amount | number:'1.2-2' }}</span>
              </div>
            }
            <div class="pnl-row total">
              <span>Total Ingresos</span>
              <span class="pos">RD$ {{ s.totalIncome | number:'1.2-2' }}</span>
            </div>

            <div class="pnl-section-title">Gastos</div>
            @for (row of s.expenseByAccount; track row.account) {
              <div class="pnl-row">
                <span>{{ row.account }}</span>
                <span class="neg">RD$ {{ row.amount | number:'1.2-2' }}</span>
              </div>
            }
            <div class="pnl-row total">
              <span>Total Gastos</span>
              <span class="neg">RD$ {{ s.totalExpenses | number:'1.2-2' }}</span>
            </div>

            <div class="pnl-row net" [class.profit]="s.netProfit >= 0" [class.loss]="s.netProfit < 0">
              <span>{{ s.netProfit >= 0 ? 'Utilidad Neta' : 'Pérdida Neta' }}</span>
              <span>RD$ {{ s.netProfit | number:'1.2-2' }}</span>
            </div>
          </div>

          <!-- Tendencia mensual -->
          <div class="card">
            <h3 class="card-title"><mat-icon>bar_chart</mat-icon> Tendencia Mensual</h3>
            <div class="chart">
              @for (m of s.monthly; track m.period) {
                <div class="chart-col">
                  <div class="bars">
                    <div class="bar income-bar" [style.height.%]="barH(m.income)" [title]="'Ingresos: RD$ ' + (m.income | number:'1.0-0')"></div>
                    <div class="bar expense-bar" [style.height.%]="barH(m.expense)" [title]="'Gastos: RD$ ' + (m.expense | number:'1.0-0')"></div>
                  </div>
                  <span class="chart-label">{{ m.label }}</span>
                </div>
              }
            </div>
            <div class="legend">
              <span class="legend-item"><span class="dot income-dot"></span> Ingresos</span>
              <span class="legend-item"><span class="dot expense-dot"></span> Gastos</span>
            </div>
          </div>
        </div>

        <!-- Transacciones recientes -->
        <div class="card">
          <div class="card-title-row">
            <h3 class="card-title"><mat-icon>history</mat-icon> Transacciones Recientes</h3>
            <a class="link" routerLink="/contabilidad/transacciones">Ver todas →</a>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Fecha</th><th>Cuenta</th><th>Descripción</th><th>Tipo</th><th class="right">Monto</th></tr>
              </thead>
              <tbody>
                @for (t of recent(); track t.id) {
                  <tr>
                    <td>{{ t.date | date:'dd/MM/yy' }}</td>
                    <td>{{ t.accountName }}</td>
                    <td class="muted">{{ t.description }}</td>
                    <td>
                      <span class="pill" [class.pill-in]="t.type === 'ingreso'" [class.pill-out]="t.type === 'gasto'">
                        {{ t.type === 'ingreso' ? 'Ingreso' : 'Gasto' }}
                      </span>
                    </td>
                    <td class="right" [class.pos]="t.type === 'ingreso'" [class.neg]="t.type === 'gasto'">
                      {{ t.type === 'gasto' ? '-' : '+' }}RD$ {{ t.amount | number:'1.2-2' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else {
        <div class="empty">Cargando información contable…</div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; padding-bottom: 40px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
    .header-text h1 { font-family: var(--pc-font-heading); font-size: 1.8rem; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: var(--pc-yellow); }
    .header-text p { color: var(--pc-text-muted); font-size: 0.9rem; }
    .btn-primary { background: var(--pc-yellow); color: #1A1A2E; border: none; padding: 10px 20px; border-radius: var(--pc-radius-md); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; text-decoration: none; transition: all 0.2s; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(242, 201, 76, 0.2); }

    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 22px; flex-wrap: wrap; }
    .local-select { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.2); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-md); padding: 4px 12px; }
    .local-select mat-icon { color: var(--pc-yellow); font-size: 20px; width: 20px; height: 20px; }
    .local-select select { background: transparent; border: none; color: var(--pc-text-primary); font-family: var(--pc-font-body); font-size: 0.9rem; padding: 8px 4px; outline: none; cursor: pointer; }
    .local-select select option { background: var(--pc-bg-sidebar); }
    .btn-excel { display: flex; align-items: center; gap: 8px; background: rgba(16,185,129,0.12); color: #34D399; border: 1px solid rgba(16,185,129,0.3); padding: 9px 18px; border-radius: var(--pc-radius-md); font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-excel:hover { background: rgba(16,185,129,0.2); }
    .btn-excel mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card { display: flex; align-items: center; gap: 16px; padding: 20px; border-radius: var(--pc-radius-lg); border: 1px solid var(--pc-border); background: linear-gradient(135deg, rgba(22,33,62,0.6), rgba(26,26,46,0.4)); }
    .kpi-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .kpi-icon mat-icon { font-size: 26px; width: 26px; height: 26px; }
    .kpi-card.income .kpi-icon { background: rgba(16,185,129,0.15); color: #34D399; }
    .kpi-card.expense .kpi-icon { background: rgba(239,68,68,0.15); color: #F87171; }
    .kpi-card.neutral .kpi-icon { background: rgba(242,201,76,0.15); color: var(--pc-yellow); }
    .kpi-body { display: flex; flex-direction: column; }
    .kpi-label { font-size: 0.78rem; color: var(--pc-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-value { font-size: 1.5rem; font-weight: 700; font-family: var(--pc-font-heading); }

    .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    @media (max-width: 900px) { .columns { grid-template-columns: 1fr; } }

    .card { background: linear-gradient(135deg, rgba(22,33,62,0.6), rgba(26,26,46,0.4)); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg); padding: 22px; }
    .card-title { display: flex; align-items: center; gap: 8px; font-size: 1.05rem; font-weight: 600; margin-bottom: 16px; }
    .card-title mat-icon { color: var(--pc-yellow); font-size: 20px; width: 20px; height: 20px; }
    .card-title-row { display: flex; justify-content: space-between; align-items: center; }
    .link { color: var(--pc-yellow); font-size: 0.82rem; text-decoration: none; }

    /* P&L */
    .pnl-section-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pc-text-muted); margin: 14px 0 6px; border-bottom: 1px solid var(--pc-border); padding-bottom: 4px; }
    .pnl-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.88rem; }
    .pnl-row.total { font-weight: 700; border-top: 1px dashed var(--pc-border); margin-top: 4px; }
    .pnl-row.net { margin-top: 12px; padding: 12px; border-radius: var(--pc-radius-md); font-weight: 800; font-size: 1rem; }
    .pnl-row.net.profit { background: rgba(16,185,129,0.12); color: #34D399; }
    .pnl-row.net.loss { background: rgba(239,68,68,0.12); color: #F87171; }
    .pos { color: #34D399; }
    .neg { color: #F87171; }

    /* Chart */
    .chart { display: flex; align-items: flex-end; gap: 18px; height: 200px; padding: 10px 0; }
    .chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
    .bars { display: flex; align-items: flex-end; gap: 6px; height: 100%; width: 100%; justify-content: center; }
    .bar { width: 26px; border-radius: 6px 6px 0 0; min-height: 4px; transition: height 0.4s ease; }
    .income-bar { background: linear-gradient(180deg, #34D399, #059669); }
    .expense-bar { background: linear-gradient(180deg, #F87171, #DC2626); }
    .chart-label { font-size: 0.72rem; color: var(--pc-text-muted); margin-top: 8px; }
    .legend { display: flex; gap: 18px; justify-content: center; margin-top: 12px; }
    .legend-item { font-size: 0.78rem; color: var(--pc-text-secondary); display: flex; align-items: center; gap: 6px; }
    .dot { width: 10px; height: 10px; border-radius: 3px; }
    .income-dot { background: #34D399; }
    .expense-dot { background: #F87171; }

    /* Table */
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .data-table th { text-align: left; padding: 10px 12px; color: var(--pc-text-muted); font-weight: 500; border-bottom: 1px solid var(--pc-border); font-size: 0.78rem; text-transform: uppercase; }
    .data-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .data-table .right { text-align: right; }
    .data-table .muted { color: var(--pc-text-muted); }
    .pill { padding: 2px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
    .pill-in { background: rgba(16,185,129,0.12); color: #34D399; }
    .pill-out { background: rgba(239,68,68,0.12); color: #F87171; }
    .empty { padding: 60px; text-align: center; color: var(--pc-text-muted); }
  `]
})
export class AccountingDashboardComponent {
  private accounting = inject(AccountingService);

  summary = this.accounting.summary;
  locations = this.accounting.locations;
  selectedLocal = this.accounting.selectedLocal;
  recent = computed(() => this.accounting.transactions().slice(0, 8));

  onLocal(e: Event) {
    this.accounting.setLocal((e.target as HTMLSelectElement).value);
  }

  exportExcel() {
    this.accounting.exportExcel();
  }

  private maxMonthly = computed(() => {
    const m = this.summary()?.monthly ?? [];
    return Math.max(1, ...m.map(x => Math.max(x.income, x.expense)));
  });

  barH(value: number): number {
    return Math.round((value / this.maxMonthly()) * 100);
  }
}
