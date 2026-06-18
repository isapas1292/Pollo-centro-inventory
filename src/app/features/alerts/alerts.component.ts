import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatChipsModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon text-red">warning</mat-icon> Centro de Alertas</h1>
          <p>Monitorea y gestiona los productos con niveles críticos de stock</p>
        </div>
        
        <div class="filter-pills">
          <button class="pill" [class.active]="filter() === 'all'" (click)="filter.set('all')">Todas</button>
          <button class="pill pill-danger" [class.active]="filter() === 'active'" (click)="filter.set('active')">
            Activas ({{ activeCount() }})
          </button>
          <button class="pill pill-success" [class.active]="filter() === 'resolved'" (click)="filter.set('resolved')">
            Resueltas
          </button>
        </div>
      </div>

      <!-- Alerts List -->
      <div class="alerts-grid stagger-children">
        @for (alert of filteredAlerts(); track alert.id) {
          <div class="alert-card animate-fade-in-up" [class.resolved-card]="alert.status === 'resolved'">
            <div class="alert-indicator" [class.bg-red]="alert.status === 'active'" [class.bg-green]="alert.status === 'resolved'"></div>
            
            <div class="alert-header">
              <div class="alert-title">
                <mat-icon [class.text-red]="alert.status === 'active'" [class.text-green]="alert.status === 'resolved'">
                  {{ alert.status === 'active' ? 'error_outline' : 'check_circle' }}
                </mat-icon>
                <h3>{{ alert.productName }}</h3>
              </div>
              <span class="status-badge" [class.badge-active]="alert.status === 'active'" [class.badge-resolved]="alert.status === 'resolved'">
                {{ alert.status === 'active' ? 'Requiere Atención' : 'Resuelto' }}
              </span>
            </div>

            <div class="alert-body">
              <div class="stock-info">
                <div class="stock-label">Stock Actual</div>
                <div class="stock-value text-red">{{ alert.currentStock }} {{ alert.unit }}</div>
              </div>
              <div class="stock-divider">/</div>
              <div class="stock-info text-right">
                <div class="stock-label">Mínimo Requerido</div>
                <div class="stock-value">{{ alert.minStock }} {{ alert.unit }}</div>
              </div>
            </div>

            <div class="alert-footer">
              <div class="alert-meta">
                <mat-icon>schedule</mat-icon>
                <span>Generada: {{ alert.createdAt | date:'short' }}</span>
              </div>
              
              <div class="alert-actions" *ngIf="alert.status === 'active'">
                <button class="btn-whatsapp" [class.opacity-50]="alert.whatsappSent" (click)="notifySupplier(alert)">
                  <mat-icon>chat</mat-icon> {{ alert.whatsappSent ? 'Notificado' : 'Notificar' }}
                </button>
                <button class="btn-resolve" (click)="resolve(alert.id)">
                  <mat-icon>check</mat-icon> Marcar Resuelto
                </button>
              </div>
              <div class="alert-actions" *ngIf="alert.status === 'resolved'">
                <span class="resolved-text">Resuelto: {{ alert.resolvedAt | date:'short' }}</span>
              </div>
            </div>
          </div>
        }

        @if (filteredAlerts().length === 0) {
          <div class="empty-state">
            <div class="empty-icon-wrap"><mat-icon>thumb_up</mat-icon></div>
            <h3>Todo en orden</h3>
            <p>No hay alertas que coincidan con tu filtro.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1000px; margin: 0 auto; padding-bottom: 40px; }
    
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 32px; flex-wrap: wrap; gap: 16px;
    }
    
    .header-text h1 { font-family: var(--pc-font-heading); font-size: 1.8rem; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; }
    .header-text p { color: var(--pc-text-muted); font-size: 0.9rem; }
    
    /* Pills */
    .filter-pills { display: flex; gap: 8px; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 24px; border: 1px solid var(--pc-border); }
    .pill {
      background: transparent; border: none; color: var(--pc-text-secondary);
      padding: 6px 16px; border-radius: 20px; font-weight: 500; font-size: 0.85rem;
      cursor: pointer; transition: all 0.2s;
    }
    .pill:hover { color: var(--pc-text-primary); }
    .pill.active { background: rgba(255,255,255,0.1); color: var(--pc-text-primary); }
    .pill-danger.active { background: rgba(239, 68, 68, 0.15); color: #F87171; }
    .pill-success.active { background: rgba(16, 185, 129, 0.15); color: #34D399; }

    /* Grid */
    .alerts-grid { display: grid; gap: 16px; }
    
    /* Card */
    .alert-card {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg);
      position: relative; overflow: hidden; transition: all 0.2s;
    }
    .alert-card:hover { border-color: var(--pc-border-active); transform: translateY(-2px); }
    
    .resolved-card { opacity: 0.75; }
    .resolved-card:hover { opacity: 1; }

    .alert-indicator { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
    
    .alert-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .alert-title { display: flex; align-items: center; gap: 10px; }
    .alert-title h3 { font-size: 1.1rem; font-weight: 600; }
    .alert-title mat-icon { font-size: 22px; width: 22px; height: 22px; }
    
    .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-active { background: rgba(239, 68, 68, 0.1); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.2); }
    .badge-resolved { background: rgba(16, 185, 129, 0.1); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.2); }

    .alert-body { display: flex; align-items: center; padding: 20px; gap: 24px; background: rgba(0,0,0,0.1); }
    .stock-info { flex: 1; }
    .stock-label { font-size: 0.8rem; color: var(--pc-text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .stock-value { font-size: 1.5rem; font-weight: 700; font-family: var(--pc-font-heading); }
    .stock-divider { font-size: 2rem; color: var(--pc-border); font-weight: 200; }

    .alert-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; }
    .alert-meta { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--pc-text-muted); }
    .alert-meta mat-icon { font-size: 16px; width: 16px; height: 16px; }
    
    .alert-actions { display: flex; gap: 12px; }
    
    .btn-whatsapp {
      background: rgba(37, 211, 102, 0.1); color: #25D366; border: 1px solid rgba(37, 211, 102, 0.3);
      padding: 6px 14px; border-radius: var(--pc-radius-md); font-weight: 600; font-size: 0.85rem;
      cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
    }
    .btn-whatsapp:hover { background: rgba(37, 211, 102, 0.2); }
    
    .btn-resolve {
      background: rgba(255,255,255,0.05); color: var(--pc-text-primary); border: 1px solid var(--pc-border);
      padding: 6px 14px; border-radius: var(--pc-radius-md); font-weight: 600; font-size: 0.85rem;
      cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
    }
    .btn-resolve:hover { background: rgba(255,255,255,0.1); color: var(--pc-yellow); border-color: var(--pc-yellow); }

    .resolved-text { font-size: 0.85rem; color: var(--pc-text-muted); font-weight: 500; }

    /* Empty State */
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px 20px; text-align: center; background: rgba(22, 33, 62, 0.4); border-radius: var(--pc-radius-lg); border: 1px dashed var(--pc-border); }
    .empty-icon-wrap { width: 64px; height: 64px; background: rgba(16, 185, 129, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
    .empty-icon-wrap mat-icon { font-size: 32px; width: 32px; height: 32px; color: #10B981; }
    .empty-state h3 { font-size: 1.2rem; margin-bottom: 8px; color: var(--pc-text-primary); }
    .empty-state p { color: var(--pc-text-muted); font-size: 0.9rem; }

    /* Utilities */
    .text-red { color: #EF4444 !important; }
    .text-green { color: #10B981 !important; }
    .bg-red { background: #EF4444; }
    .bg-green { background: #10B981; }
    .text-right { text-align: right; }
    .opacity-50 { opacity: 0.5; pointer-events: none; }

    @media (max-width: 600px) {
      .alert-header { flex-direction: column; align-items: flex-start; gap: 12px; }
      .alert-body { flex-direction: column; gap: 12px; align-items: flex-start; }
      .stock-divider { display: none; }
      .stock-info.text-right { text-align: left; }
      .alert-footer { flex-direction: column; align-items: flex-start; gap: 16px; }
    }
  `]
})
export class AlertsComponent {
  filter = signal<'all' | 'active' | 'resolved'>('active');

  constructor(public dataService: DataService) {}

  filteredAlerts = computed(() => {
    const alerts = this.dataService.alerts();
    const currentFilter = this.filter();
    
    let filtered = alerts;
    if (currentFilter === 'active') {
      filtered = alerts.filter(a => a.status === 'active');
    } else if (currentFilter === 'resolved') {
      filtered = alerts.filter(a => a.status === 'resolved');
    }
    
    // Sort: Active first, then by date desc
    return filtered.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  activeCount = computed(() => this.dataService.activeAlerts().length);

  resolve(id: string) {
    this.dataService.resolveAlert(id);
  }

  notifySupplier(alert: any) {
    this.dataService.markAlertWhatsappSent(alert.id);
    // In a real app, this would open window.open(`https://wa.me/...?text=...`)
    alert.whatsappSent = true; 
  }
}
