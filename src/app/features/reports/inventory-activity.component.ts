import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-inventory-activity',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="report-page animate-fade-in-up">
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">history</mat-icon> Actividad de Inventario</h1>
          <p>Módulo de actividad de inventario.</p>
        </div>
      </div>
      <div class="content-card">
        <p>Próximamente...</p>
      </div>
    </div>
  `,
  styles: [`
    .report-page {
      max-width: 1400px;
      margin: 0 auto;
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
    .content-card {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      padding: 40px;
      text-align: center;
      color: var(--pc-text-muted);
    }
  `]
})
export class InventoryActivityComponent {}
