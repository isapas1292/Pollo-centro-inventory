import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

interface ClosingInventoryItem {
  id: number;
  store: string;
  enabled: boolean;
  state: string;
  city: string;
  module: string;
  inventoryDate: string;
  total: number;
}

@Component({
  selector: 'app-closing-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="report-page animate-fade-in-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">list_alt</mat-icon> Cierre de Inventario</h1>
          <p>Consulta y exporta los totales del inventario de todas las sucursales.</p>
        </div>
        <button class="btn-primary">
          <mat-icon>download</mat-icon>
          <span>Export Inventory Totals</span>
        </button>
      </div>

      <!-- Filters -->
      <div class="filters-row">
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-gray-400">Filter</label>
          <select class="pc-select">
            <option>All</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <select class="pc-select">
            <option>Select Location</option>
          </select>
        </div>
      </div>

      <!-- Table -->
      <div class="activity-section mt-4">
        <div class="overflow-x-auto">
          <table class="text-left border-collapse">
            <thead>
              <tr class="table-header-row">
                <th class="th-cell">#</th>
                <th class="th-cell">STORE</th>
                <th class="th-cell">STATE</th>
                <th class="th-cell">CITY</th>
                <th class="th-cell">MODULE</th>
                <th class="th-cell">INVENTORY DATE</th>
                <th class="th-cell text-right">INVENTORY TOTAL</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item.id) {
                <tr class="table-row">
                  <td class="td-cell text-gray-400">{{ item.id }}</td>
                  <td class="td-cell">
                    <div class="flex items-center gap-2 font-bold text-gray-100">
                      {{ item.store }}
                      @if (item.enabled) {
                        <span class="badge-enabled">ENABLED</span>
                      }
                    </div>
                  </td>
                  <td class="td-cell text-gray-300">{{ item.state }}</td>
                  <td class="td-cell text-gray-300">{{ item.city }}</td>
                  <td class="td-cell text-gray-300 font-medium">{{ item.module }}</td>
                  <td class="td-cell">
                    <input type="date" [(ngModel)]="item.inventoryDate" class="pc-input-date">
                  </td>
                  <td class="td-cell text-right font-bold text-blue-400">
                    {{ item.total | currency }}
                  </td>
                </tr>
              } @empty {
                <tr><td class="td-cell" colspan="7" style="text-align:center; padding:32px; color: var(--pc-text-muted);">Sin datos de cierre de inventario.</td></tr>
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

    .filters-row {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 16px;
    }

    .pc-select {
      appearance: none;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-md);
      padding: 8px 32px 8px 12px;
      color: var(--pc-text-primary);
      font-family: var(--pc-font-body);
      font-size: 0.9rem;
      outline: none;
      cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F2C94C'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 16px;
      min-width: 150px;
      transition: all var(--pc-transition-fast);
    }
    .pc-select option {
      background: var(--pc-bg-sidebar);
      color: white;
    }

    .pc-select:focus {
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
      margin-top: 16px;
    }

    .table-header-row {
      background: rgba(0, 0, 0, 0.4);
    }

    .th-cell {
      padding: 12px 16px;
      font-size: 0.7rem;
      color: var(--pc-text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .table-row {
      border-bottom: 1px solid var(--pc-border);
      transition: background var(--pc-transition-fast);
    }

    .table-row:last-child {
      border-bottom: none;
    }

    .table-row:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .td-cell {
      padding: 16px;
      font-size: 0.85rem;
    }

    .badge-enabled {
      font-size: 0.6rem;
      border: 1px solid var(--pc-border);
      padding: 2px 4px;
      border-radius: 4px;
      color: var(--pc-text-secondary);
    }

    .pc-input-date {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-md);
      padding: 6px 10px;
      color: var(--pc-text-primary);
      font-family: var(--pc-font-body);
      font-size: 0.85rem;
      color-scheme: dark;
    }
  `]
})
export class ClosingInventoryComponent {
  // Sin datos mockeados: este reporte no tiene aún una fuente en el backend.
  items = signal<ClosingInventoryItem[]>([]);
}
