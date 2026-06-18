import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../../core/services/data.service';

interface InventoryActivityItem {
  id: string;
  name: string;
  vendor: string;
  itemNumber: string;
  lastPurchased: string;
  lastInventoried: string;
  lastSold: string;
}

@Component({
  selector: 'app-inventory-activity',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="report-page animate-fade-in-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">history</mat-icon> Actividad de Inventario</h1>
          <p>Supervisa los movimientos, compras y consumo de los productos.</p>
        </div>
        <button class="btn-primary">
          <mat-icon>print</mat-icon>
          <span>Imprimir Reporte</span>
        </button>
      </div>

      <!-- Filters -->
      <div class="filters-container mt-4">
        
        <!-- Date Range -->
        <div class="filter-group">
          <label class="font-bold text-gray-900 dark:text-white mb-1 text-sm">Date Range</label>
          <input type="date" class="pc-input w-full min-w-[240px]">
        </div>

        <!-- Search -->
        <div class="search-box">
          <mat-icon class="search-icon">search</mat-icon>
          <input type="text" class="pc-input w-full pl-10 search-input" placeholder="Buscar actividad...">
        </div>

        <!-- Button -->
        <button class="btn-primary w-full mt-2">
          <span>View Activity</span>
        </button>

      </div>

      <!-- Table -->
      <div class="activity-section mt-4">
        <div class="overflow-x-auto">
          <table class="text-left border-collapse">
            <thead>
              <tr class="table-header-row">
                <th class="th-cell">
                  <div class="flex items-center gap-1">
                    INVENTORY ITEM <mat-icon class="sort-icon">arrow_drop_up</mat-icon>
                  </div>
                </th>
                <th class="th-cell">
                  <div class="flex items-center gap-1">
                    VENDOR <mat-icon class="sort-icon">filter_list</mat-icon>
                  </div>
                </th>
                <th class="th-cell">
                  <div class="flex items-center gap-1">
                    ITEM NUMBER <mat-icon class="sort-icon">filter_list</mat-icon>
                  </div>
                </th>
                <th class="th-cell">
                  <div class="flex items-center gap-1">
                    LAST PURCHASED <mat-icon class="sort-icon">filter_list</mat-icon>
                  </div>
                </th>
                <th class="th-cell">
                  <div class="flex items-center gap-1">
                    LAST INVENTORIED <mat-icon class="sort-icon">filter_list</mat-icon>
                  </div>
                </th>
                <th class="th-cell">
                  <div class="flex items-center gap-1">
                    LAST SOLD <mat-icon class="sort-icon">filter_list</mat-icon>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item.id; let odd = $odd) {
                <tr class="table-row">
                  <td class="td-cell text-gray-100 font-medium">{{ item.name }}</td>
                  <td class="td-cell">{{ item.vendor }}</td>
                  <td class="td-cell">{{ item.itemNumber }}</td>
                  <td class="td-cell">{{ item.lastPurchased }}</td>
                  <td class="td-cell">{{ item.lastInventoried }}</td>
                  <td class="td-cell">{{ item.lastSold }}</td>
                </tr>
              } @empty {
                <tr><td class="td-cell" colspan="6" style="text-align:center; padding:32px; color: var(--pc-text-muted);">Sin datos de inventario.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .report-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 16px;
    }

    .font-heading {
      font-family: var(--pc-font-heading);
    }

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

    .filters-container {
      margin-bottom: 24px;
      display: inline-flex;
      flex-direction: column;
      gap: 16px;
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      padding: 24px;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: var(--pc-yellow);
      color: #1A1A2E;
      font-weight: 700;
      border: none;
      padding: 10px 20px;
      border-radius: var(--pc-radius-md);
      cursor: pointer;
      transition: all var(--pc-transition-fast);
      font-size: 0.95rem;
    }

    .btn-primary:hover {
      background: #FBBF24;
      transform: translateY(-1px);
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      max-width: 400px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: var(--pc-text-muted);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .search-input {
      padding-left: 40px !important;
    }

    .pc-input {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-md);
      padding: 10px 12px;
      color: var(--pc-text-primary);
      font-family: var(--pc-font-body);
      font-size: 0.95rem;
      transition: all var(--pc-transition-fast);
      color-scheme: dark;
    }

    .pc-input:focus {
      outline: none;
      border-color: var(--pc-yellow);
    }

    .activity-section {
      display: inline-block;
      min-width: 60%;
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      overflow: hidden;
    }

    .table-header-row {
      background: rgba(0, 0, 0, 0.4);
    }

    .th-cell {
      padding: 12px 16px;
      font-size: 0.75rem;
      color: var(--pc-text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .sort-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .table-row {
      border-bottom: 1px solid var(--pc-border);
      transition: background var(--pc-transition-fast);
    }

    .table-row:last-child {
      border-bottom: none;
    }

    .table-row:hover {
      background: rgba(255, 255, 255, 0.04) !important;
    }

    .td-cell {
      padding: 12px 16px;
      font-size: 0.85rem;
      color: var(--pc-text-secondary);
    }
  `]
})
export class InventoryActivityComponent {
  constructor(private dataService: DataService) {}

  // Derivado de los productos reales del backend; vacío si no hay datos.
  items = computed<InventoryActivityItem[]>(() =>
    this.dataService.products().map(p => ({
      id: p.id,
      name: p.name,
      vendor: p.supplierName || '-',
      itemNumber: p.id,
      lastPurchased: p.lastUpdated ? new Date(p.lastUpdated).toLocaleDateString() : 'NA',
      lastInventoried: 'NA',
      lastSold: 'NA',
    }))
  );
}
