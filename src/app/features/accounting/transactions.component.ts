import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AccountingService } from '../../core/services/accounting.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { Transaction, TransactionType, PAYMENT_METHODS } from '../../core/models';

@Component({
  selector: 'app-accounting-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">receipt_long</mat-icon> Transacciones</h1>
          <p>Registra los ingresos y gastos del negocio</p>
        </div>
        <button class="btn-primary" (click)="openModal()"><mat-icon>add</mat-icon> Nueva Transacción</button>
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
        <div class="date-filters">
          <label>
            <span>Desde</span>
            <input type="date" [value]="fromDate()" (change)="onDateRange($event, 'from')">
          </label>
          <label>
            <span>Hasta</span>
            <input type="date" [value]="toDate()" (change)="onDateRange($event, 'to')">
          </label>
          @if (fromDate() || toDate()) {
            <button class="btn-clear" (click)="clearDates()" title="Limpiar fechas"><mat-icon>close</mat-icon></button>
          }
        </div>
        <button class="btn-excel" (click)="exportExcel()"><mat-icon>download</mat-icon> Exportar a Excel</button>
      </div>

      <!-- Filtros -->
      <div class="filters">
        <button class="chip" [class.active]="filter() === 'todos'" (click)="filter.set('todos')">Todos</button>
        <button class="chip" [class.active]="filter() === 'ingreso'" (click)="filter.set('ingreso')">Ingresos</button>
        <button class="chip" [class.active]="filter() === 'gasto'" (click)="filter.set('gasto')">Gastos</button>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Fecha</th><th>Local</th><th>Cuenta</th><th>Descripción</th><th>Método</th><th>Tipo</th><th class="right">Monto</th><th></th></tr>
            </thead>
            <tbody>
              @for (t of filtered(); track t.id) {
                <tr>
                  <td>{{ t.date | date:'dd/MM/yyyy' }}</td>
                  <td class="muted">{{ t.localName }}</td>
                  <td>{{ t.accountName }}</td>
                  <td class="muted">{{ t.description }}<span *ngIf="t.contact"> · {{ t.contact }}</span></td>
                  <td class="muted">{{ t.paymentMethod }}</td>
                  <td>
                    <span class="pill" [class.pill-in]="t.type === 'ingreso'" [class.pill-out]="t.type === 'gasto'">
                      {{ t.type === 'ingreso' ? 'Ingreso' : 'Gasto' }}
                    </span>
                  </td>
                  <td class="right" [class.pos]="t.type === 'ingreso'" [class.neg]="t.type === 'gasto'">
                    {{ t.type === 'gasto' ? '-' : '+' }}$ {{ t.amount | number:'1.2-2' }}
                  </td>
                  <td class="right">
                    <button class="icon-btn edit-btn" (click)="openModal(t)"><mat-icon>edit</mat-icon></button>
                    <button class="icon-btn delete-btn" (click)="remove(t)"><mat-icon>delete</mat-icon></button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="empty">No hay transacciones registradas.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editing() ? 'Editar' : 'Nueva' }} Transacción</h2>
              <button mat-icon-button (click)="closeModal()"><mat-icon>close</mat-icon></button>
            </div>
            <div class="modal-body">
              <div class="type-toggle">
                <button [class.on-in]="form.type === 'ingreso'" (click)="setType('ingreso')">
                  <mat-icon>trending_up</mat-icon> Ingreso
                </button>
                <button [class.on-out]="form.type === 'gasto'" (click)="setType('gasto')">
                  <mat-icon>trending_down</mat-icon> Gasto
                </button>
              </div>

              <div class="form-group">
                <label>Local / Negocio</label>
                <select [(ngModel)]="form.localId" class="pc-select">
                  @for (loc of locations(); track loc.id) { <option [value]="loc.id">{{ loc.name }}</option> }
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Cuenta / Categoría</label>
                  <select [(ngModel)]="form.accountId" class="pc-select">
                    <option value="">Seleccione…</option>
                    @for (a of accountsForType(); track a.id) {
                      <option [value]="a.id">{{ a.code }} · {{ a.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>Monto ($)</label>
                  <input type="number" min="0" step="0.01" [(ngModel)]="form.amount" class="pc-input" placeholder="0.00">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Fecha</label>
                  <input type="date" [(ngModel)]="form.date" class="pc-input">
                </div>
                <div class="form-group">
                  <label>Método de Pago</label>
                  <select [(ngModel)]="form.paymentMethod" class="pc-select">
                    @for (m of paymentMethods; track m) { <option [value]="m">{{ m }}</option> }
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Descripción</label>
                <input type="text" [(ngModel)]="form.description" class="pc-input" placeholder="Detalle de la transacción">
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Contacto (Cliente/Proveedor)</label>
                  <input type="text" [(ngModel)]="form.contact" class="pc-input" placeholder="Opcional">
                </div>
                <div class="form-group">
                  <label>Referencia / Factura</label>
                  <input type="text" [(ngModel)]="form.reference" class="pc-input" placeholder="Opcional">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeModal()">Cancelar</button>
              <button class="btn-primary" (click)="save()" [disabled]="!form.accountId || !form.amount">Guardar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1100px; margin: 0 auto; padding-bottom: 40px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
    .header-text h1 { font-family: var(--pc-font-heading); font-size: 1.8rem; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: var(--pc-yellow); }
    .header-text p { color: var(--pc-text-muted); font-size: 0.9rem; }
    .btn-primary { background: var(--pc-yellow); color: #1A1A2E; border: none; padding: 10px 20px; border-radius: var(--pc-radius-md); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: rgba(255,255,255,0.05); color: var(--pc-text-primary); border: 1px solid var(--pc-border); padding: 10px 20px; border-radius: var(--pc-radius-md); font-weight: 500; cursor: pointer; }

    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .local-select { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.2); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-md); padding: 4px 12px; }
    .local-select mat-icon { color: var(--pc-yellow); font-size: 20px; width: 20px; height: 20px; }
    .local-select select { background: transparent; border: none; color: var(--pc-text-primary); font-family: var(--pc-font-body); font-size: 0.9rem; padding: 8px 4px; outline: none; cursor: pointer; }
    .local-select select option { background: var(--pc-bg-sidebar); }
    .date-filters { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .date-filters label { display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.2); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-md); padding: 4px 10px; }
    .date-filters span { color: var(--pc-text-muted); font-size: 0.78rem; }
    .date-filters input { background: transparent; border: none; color: var(--pc-text-primary); font-family: var(--pc-font-body); font-size: 0.86rem; padding: 8px 0; outline: none; color-scheme: dark; }
    .btn-clear { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); color: var(--pc-text-secondary); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-md); cursor: pointer; }
    .btn-clear:hover { color: var(--pc-yellow); border-color: var(--pc-yellow); }
    .btn-clear mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-excel { display: flex; align-items: center; gap: 8px; background: rgba(16,185,129,0.12); color: #34D399; border: 1px solid rgba(16,185,129,0.3); padding: 9px 18px; border-radius: var(--pc-radius-md); font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-excel:hover { background: rgba(16,185,129,0.2); }
    .btn-excel mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .filters { display: flex; gap: 8px; margin-bottom: 16px; }
    .chip { background: rgba(255,255,255,0.04); border: 1px solid var(--pc-border); color: var(--pc-text-secondary); padding: 6px 16px; border-radius: 20px; cursor: pointer; font-size: 0.82rem; transition: all 0.2s; }
    .chip.active { background: rgba(242,201,76,0.12); color: var(--pc-yellow); border-color: var(--pc-yellow); }

    .card { background: linear-gradient(135deg, rgba(22,33,62,0.6), rgba(26,26,46,0.4)); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg); padding: 8px; }
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .data-table th { text-align: left; padding: 12px; color: var(--pc-text-muted); font-weight: 500; border-bottom: 1px solid var(--pc-border); font-size: 0.76rem; text-transform: uppercase; }
    .data-table td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .data-table .right { text-align: right; }
    .data-table .muted { color: var(--pc-text-muted); }
    .pos { color: #34D399; font-weight: 600; }
    .neg { color: #F87171; font-weight: 600; }
    .pill { padding: 2px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
    .pill-in { background: rgba(16,185,129,0.12); color: #34D399; }
    .pill-out { background: rgba(239,68,68,0.12); color: #F87171; }
    .icon-btn { background: transparent; border: none; color: var(--pc-text-muted); cursor: pointer; padding: 4px; border-radius: 4px; }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .edit-btn:hover { color: var(--pc-yellow); }
    .delete-btn:hover { color: #EF4444; }
    .empty { text-align: center; color: var(--pc-text-muted); padding: 40px; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-content { background: var(--pc-bg-sidebar); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg); width: 100%; max-width: 560px; box-shadow: var(--pc-shadow-xl); animation: modalSlideIn 0.3s ease; max-height: 92vh; overflow-y: auto; }
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

    .type-toggle { display: flex; gap: 10px; }
    .type-toggle button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: var(--pc-radius-md); border: 1px solid var(--pc-border); background: rgba(0,0,0,0.2); color: var(--pc-text-secondary); cursor: pointer; font-weight: 600; }
    .type-toggle .on-in { background: rgba(16,185,129,0.15); color: #34D399; border-color: #34D399; }
    .type-toggle .on-out { background: rgba(239,68,68,0.15); color: #F87171; border-color: #F87171; }
    .type-toggle mat-icon { font-size: 18px; width: 18px; height: 18px; }

    @media (max-width: 600px) { .form-row { flex-direction: column; gap: 14px; } }
  `]
})
export class TransactionsComponent implements OnInit {
  private accounting = inject(AccountingService);
  private auth = inject(AuthService);
  private confirm = inject(ConfirmService);

  transactions = this.accounting.transactions;
  accounts = this.accounting.accounts;
  locations = this.accounting.locations;
  selectedLocal = this.accounting.selectedLocal;
  fromDate = this.accounting.fromDate;
  toDate = this.accounting.toDate;
  paymentMethods = PAYMENT_METHODS;

  filter = signal<'todos' | 'ingreso' | 'gasto'>('todos');
  showModal = signal(false);
  editing = signal<Transaction | null>(null);

  filtered = computed(() => {
    const f = this.filter();
    const list = this.transactions();
    return f === 'todos' ? list : list.filter(t => t.type === f);
  });

  form = this.blankForm();

  ngOnInit() {
    this.accounting.loadAll();
  }

  accountsForType() {
    const wanted = this.form.type === 'ingreso' ? 'Ingreso' : 'Gasto';
    const list = this.accounts().filter(a => a.active && a.type === wanted);
    return list.length ? list : this.accounts().filter(a => a.active);
  }

  onLocal(e: Event) {
    this.accounting.setLocal((e.target as HTMLSelectElement).value);
  }

  onDateRange(e: Event, side: 'from' | 'to') {
    const value = (e.target as HTMLInputElement).value;
    const from = side === 'from' ? value : this.fromDate();
    const to = side === 'to' ? value : this.toDate();
    this.accounting.setDateRange(from, to);
  }

  clearDates() {
    this.accounting.clearDateRange();
  }

  exportExcel() {
    this.accounting.exportExcel();
  }

  private defaultLocalId() {
    const sel = this.selectedLocal();
    return sel && sel !== 'all' ? sel : (this.locations()[0]?.id ?? '');
  }

  private blankForm() {
    return {
      type: 'gasto' as TransactionType,
      localId: this.defaultLocalId(),
      accountId: '',
      amount: null as number | null,
      date: new Date().toISOString().substring(0, 10),
      paymentMethod: 'efectivo',
      description: '',
      contact: '',
      reference: '',
    };
  }

  setType(t: TransactionType) {
    this.form.type = t;
    this.form.accountId = '';
  }

  openModal(t?: Transaction) {
    if (t) {
      this.editing.set(t);
      this.form = {
        type: t.type,
        localId: t.localId || this.defaultLocalId(),
        accountId: t.accountId,
        amount: t.amount,
        date: (typeof t.date === 'string' ? t.date : new Date(t.date).toISOString()).substring(0, 10),
        paymentMethod: t.paymentMethod || 'efectivo',
        description: t.description || '',
        contact: t.contact || '',
        reference: t.reference || '',
      };
    } else {
      this.editing.set(null);
      this.form = this.blankForm();
    }
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  async save() {
    if (!this.form.accountId || !this.form.amount) return;
    const payload = {
      type: this.form.type,
      localId: this.form.localId,
      accountId: this.form.accountId,
      amount: Number(this.form.amount),
      date: this.form.date,
      paymentMethod: this.form.paymentMethod,
      description: this.form.description,
      contact: this.form.contact,
      reference: this.form.reference,
      recordedBy: this.auth.userName(),
    };
    if (this.editing()) {
      await this.accounting.updateTransaction(this.editing()!.id, payload);
    } else {
      await this.accounting.addTransaction(payload);
    }
    this.closeModal();
  }

  async remove(t: Transaction) {
    if (await this.confirm.ask('¿Eliminar esta transacción?', { confirmText: 'Eliminar' })) {
      await this.accounting.deleteTransaction(t.id);
    }
  }
}
