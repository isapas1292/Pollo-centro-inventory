import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-loss-statement',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="report-page animate-fade-in-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">trending_down</mat-icon> Pérdidas y Ganancias</h1>
          <p>Genera reportes de varianza y pérdidas de inventario.</p>
        </div>
      </div>

      <!-- Form -->
      <div class="content-card max-w-2xl">
        <form (ngSubmit)="runStatement()" class="space-y-10">
          
          <!-- PMix Report Radios -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-16">
            <label class="font-bold text-gray-900 dark:text-white min-w-[150px]">
              PMix Report
            </label>
            <div class="flex items-center gap-6">
              <label class="radio-label">
                <input type="radio" name="pmix" value="all" [(ngModel)]="pmixOption" class="pc-radio">
                <span>All Categories</span>
              </label>
              <label class="radio-label">
                <input type="radio" name="pmix" value="select" [(ngModel)]="pmixOption" class="pc-radio">
                <span>Select Categories</span>
              </label>
            </div>
          </div>

          <!-- Date Range -->
          <div class="space-y-2">
            <label class="font-bold text-gray-900 dark:text-white block">
              Select Date Range
            </label>
            <div class="relative max-w-lg">
              <input type="date" [(ngModel)]="dateRange" name="dateRange" class="pc-input w-full">
            </div>
          </div>

          <!-- Action Button -->
          <div class="pt-4">
            <button type="submit" class="btn-primary w-full sm:w-auto px-8">
              Run Loss Statement
            </button>
          </div>

        </form>
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

    .content-card {
      display: inline-block;
      min-width: 60%;
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      padding: 40px;
    }

    .radio-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      color: var(--pc-text-secondary);
      font-size: 0.95rem;
    }

    .pc-radio {
      accent-color: var(--pc-yellow);
      width: 16px;
      height: 16px;
      cursor: pointer;
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
      background: rgba(0, 0, 0, 0.3);
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
      padding: 12px 24px;
      border-radius: var(--pc-radius-md);
      cursor: pointer;
      transition: all var(--pc-transition-fast);
      font-size: 1rem;
    }

    .btn-primary:hover {
      background: #FBBF24;
      transform: translateY(-1px);
    }
  `]
})
export class LossStatementComponent {
  pmixOption = signal('all');
  dateRange = signal('');

  runStatement() {
    console.log('Running Loss Statement with:', {
      pmix: this.pmixOption(),
      date: this.dateRange()
    });
    alert('Reporte generado en consola (Demo)');
  }
}
