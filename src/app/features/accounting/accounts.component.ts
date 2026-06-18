import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AccountingService } from '../../core/services/accounting.service';
import { Account, AccountType, ACCOUNT_TYPES } from '../../core/models';

@Component({
  selector: 'app-accounting-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">account_tree</mat-icon> Plan de Cuentas</h1>
          <p>Estructura contable del negocio (Chart of Accounts)</p>
        </div>
        <button class="btn-primary" (click)="openModal()"><mat-icon>add</mat-icon> Nueva Cuenta</button>
      </div>

      @for (group of grouped(); track group.type) {
        <div class="card">
          <h3 class="group-title">
            <span class="type-badge" [attr.data-type]="group.type">{{ group.type }}</span>
            <span class="count">{{ group.items.length }} cuentas</span>
          </h3>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th style="width:90px">Código</th><th>Nombre</th><th>Descripción</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                @for (a of group.items; track a.id) {
                  <tr [class.inactive]="!a.active">
                    <td class="code">{{ a.code }}</td>
                    <td>{{ a.name }}</td>
                    <td class="muted">{{ a.description }}</td>
                    <td><span class="status" [class.on]="a.active" [class.off]="!a.active">{{ a.active ? 'Activa' : 'Inactiva' }}</span></td>
                    <td class="right">
                      <button class="icon-btn edit-btn" (click)="openModal(a)"><mat-icon>edit</mat-icon></button>
                      <button class="icon-btn delete-btn" (click)="remove(a)"><mat-icon>delete</mat-icon></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editing() ? 'Editar' : 'Nueva' }} Cuenta</h2>
              <button mat-icon-button (click)="closeModal()"><mat-icon>close</mat-icon></button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Código</label>
                  <input type="text" [(ngModel)]="form.code" class="pc-input" placeholder="Ej. 6700">
                </div>
                <div class="form-group">
                  <label>Tipo</label>
                  <select [(ngModel)]="form.type" class="pc-select">
                    @for (t of accountTypes; track t) { <option [value]="t">{{ t }}</option> }
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Nombre</label>
                <input type="text" [(ngModel)]="form.name" class="pc-input" placeholder="Ej. Gastos de Transporte">
              </div>
              <div class="form-group">
                <label>Descripción</label>
                <input type="text" [(ngModel)]="form.description" class="pc-input" placeholder="Opcional">
              </div>
              <label class="checkbox-container">
                <input type="checkbox" [(ngModel)]="form.active"> Cuenta activa
              </label>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeModal()">Cancelar</button>
              <button class="btn-primary" (click)="save()" [disabled]="!form.code || !form.name">Guardar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1000px; margin: 0 auto; padding-bottom: 40px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-text h1 { font-family: var(--pc-font-heading); font-size: 1.8rem; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: var(--pc-yellow); }
    .header-text p { color: var(--pc-text-muted); font-size: 0.9rem; }
    .btn-primary { background: var(--pc-yellow); color: #1A1A2E; border: none; padding: 10px 20px; border-radius: var(--pc-radius-md); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: rgba(255,255,255,0.05); color: var(--pc-text-primary); border: 1px solid var(--pc-border); padding: 10px 20px; border-radius: var(--pc-radius-md); cursor: pointer; }

    .card { background: linear-gradient(135deg, rgba(22,33,62,0.6), rgba(26,26,46,0.4)); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg); padding: 16px 18px; margin-bottom: 18px; }
    .group-title { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-size: 1rem; }
    .count { font-size: 0.78rem; color: var(--pc-text-muted); font-weight: 400; }
    .type-badge { padding: 4px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; }
    .type-badge[data-type="Ingreso"] { background: rgba(16,185,129,0.15); color: #34D399; }
    .type-badge[data-type="Gasto"] { background: rgba(239,68,68,0.15); color: #F87171; }
    .type-badge[data-type="Activo"] { background: rgba(59,130,246,0.15); color: #60A5FA; }
    .type-badge[data-type="Pasivo"] { background: rgba(245,158,11,0.15); color: #FBBF24; }
    .type-badge[data-type="Capital"] { background: rgba(168,85,247,0.15); color: #C084FC; }

    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .data-table th { text-align: left; padding: 8px 12px; color: var(--pc-text-muted); font-weight: 500; border-bottom: 1px solid var(--pc-border); font-size: 0.74rem; text-transform: uppercase; }
    .data-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .data-table .right { text-align: right; }
    .data-table .muted { color: var(--pc-text-muted); }
    .data-table .code { font-family: monospace; color: var(--pc-yellow); }
    tr.inactive { opacity: 0.5; }
    .status { padding: 2px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
    .status.on { background: rgba(16,185,129,0.12); color: #34D399; }
    .status.off { background: rgba(239,68,68,0.12); color: #F87171; }
    .icon-btn { background: transparent; border: none; color: var(--pc-text-muted); cursor: pointer; padding: 4px; }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .edit-btn:hover { color: var(--pc-yellow); }
    .delete-btn:hover { color: #EF4444; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-content { background: var(--pc-bg-sidebar); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg); width: 100%; max-width: 480px; box-shadow: var(--pc-shadow-xl); animation: modalSlideIn 0.3s ease; }
    @keyframes modalSlideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .modal-header { padding: 18px 22px; border-bottom: 1px solid var(--pc-border); display: flex; justify-content: space-between; align-items: center; }
    .modal-header h2 { font-family: var(--pc-font-heading); font-size: 1.15rem; }
    .modal-body { padding: 22px; display: flex; flex-direction: column; gap: 14px; }
    .modal-footer { padding: 16px 22px; border-top: 1px solid var(--pc-border); display: flex; justify-content: flex-end; gap: 12px; }
    .form-group { flex: 1; }
    .form-group label { display: block; margin-bottom: 6px; font-size: 0.82rem; color: var(--pc-text-secondary); }
    .form-row { display: flex; gap: 14px; }
    .pc-input, .pc-select { width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-md); padding: 10px 14px; color: var(--pc-text-primary); font-family: var(--pc-font-body); }
    .pc-input:focus, .pc-select:focus { outline: none; border-color: var(--pc-yellow); }
    .pc-select option { background: var(--pc-bg-sidebar); }
    .checkbox-container { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; cursor: pointer; }
  `]
})
export class AccountsComponent {
  private accounting = inject(AccountingService);

  accounts = this.accounting.accounts;
  accountTypes = ACCOUNT_TYPES;

  showModal = signal(false);
  editing = signal<Account | null>(null);

  grouped = computed(() => {
    const order: AccountType[] = ['Ingreso', 'Gasto', 'Activo', 'Pasivo', 'Capital'];
    return order
      .map(type => ({ type, items: this.accounts().filter(a => a.type === type) }))
      .filter(g => g.items.length > 0);
  });

  form = this.blankForm();

  private blankForm() {
    return { code: '', name: '', type: 'Gasto' as AccountType, description: '', active: true };
  }

  openModal(a?: Account) {
    if (a) {
      this.editing.set(a);
      this.form = { code: a.code, name: a.name, type: a.type, description: a.description || '', active: a.active };
    } else {
      this.editing.set(null);
      this.form = this.blankForm();
    }
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  async save() {
    if (!this.form.code || !this.form.name) return;
    if (this.editing()) {
      await this.accounting.updateAccount(this.editing()!.id, { ...this.form });
    } else {
      await this.accounting.addAccount({ ...this.form });
    }
    this.closeModal();
  }

  async remove(a: Account) {
    if (confirm(`¿Eliminar la cuenta "${a.name}"?`)) {
      await this.accounting.deleteAccount(a.id);
    }
  }
}
