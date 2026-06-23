import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AccountingService } from '../../core/services/accounting.service';
import { CashClosingImportRecord, CashClosingImportResult, CashClosingPreview } from '../../core/models';

@Component({
  selector: 'app-cash-close-import',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <header class="page-header">
        <div>
          <h1><mat-icon>upload_file</mat-icon> Importar cierre de caja</h1>
          <p>Cierres diarios del punto de venta</p>
        </div>
        <a routerLink="/contabilidad/transacciones" class="secondary-action">
          <mat-icon>receipt_long</mat-icon> Transacciones
        </a>
      </header>

      @if (result(); as imported) {
        <section class="success-band" aria-live="polite">
          <mat-icon>check_circle</mat-icon>
          <div>
            <strong>Cierre registrado</strong>
            <span>{{ imported.transactionsCreated }} movimientos · {{ imported.localName }} · $ {{ imported.totalPayment | number:'1.2-2' }}</span>
          </div>
          <button type="button" class="icon-button" title="Importar otro cierre" (click)="reset()">
            <mat-icon>add</mat-icon>
          </button>
        </section>
      }

      <section class="import-tool">
        <div
          class="drop-zone"
          [class.dragging]="dragging()"
          [class.has-file]="selectedFile()"
          (dragover)="onDragOver($event)"
          (dragleave)="dragging.set(false)"
          (drop)="onDrop($event)">
          <input #fileInput type="file" accept="application/pdf,.pdf" (change)="onFileInput($event)">
          <mat-icon>{{ selectedFile() ? 'picture_as_pdf' : 'cloud_upload' }}</mat-icon>
          <div class="file-copy">
            <strong>{{ selectedFile()?.name || 'Cierre de caja PDF' }}</strong>
            <span>{{ selectedFile() ? formatBytes(selectedFile()!.size) : 'Máximo 1 MB' }}</span>
          </div>
          <button type="button" class="select-button" (click)="fileInput.click()">
            {{ selectedFile() ? 'Cambiar' : 'Seleccionar PDF' }}
          </button>
        </div>

        <label class="location-field">
          <span>Local</span>
          <div>
            <mat-icon>store</mat-icon>
            <select [(ngModel)]="selectedLocalId" [disabled]="importing()">
              <option value="">Seleccionar local</option>
              @for (location of locations(); track location.id) {
                <option [value]="location.id">{{ location.name }}</option>
              }
            </select>
          </div>
        </label>
      </section>

      @if (loading()) {
        <div class="status-row"><span class="spinner"></span> Leyendo cierre…</div>
      }
      @if (error()) {
        <div class="error-band" role="alert"><mat-icon>error_outline</mat-icon>{{ error() }}</div>
      }

      @if (preview(); as close) {
        <section class="closing-header">
          <div>
            <span class="eyebrow">{{ close.businessName }}</span>
            <h2>{{ close.endDate | date:'EEEE, d MMMM y':'':'es' }}</h2>
            <div class="meta">
              <span><mat-icon>point_of_sale</mat-icon>{{ close.machine }}</span>
              <span><mat-icon>tag</mat-icon>Sec. {{ close.sequence }}</span>
              <span><mat-icon>person</mat-icon>{{ close.cashier }}</span>
            </div>
          </div>
          <div class="reconciled" [class.duplicate]="close.alreadyImported">
            <mat-icon>{{ close.alreadyImported ? 'content_copy' : 'verified' }}</mat-icon>
            <span>{{ close.alreadyImported ? 'Ya importado' : 'Cierre cuadrado' }}</span>
          </div>
        </section>

        <section class="metrics-grid">
          <div class="metric">
            <span>Venta neta</span>
            <strong>$ {{ close.netSales | number:'1.2-2' }}</strong>
          </div>
          <div class="metric tax">
            <span>Impuestos</span>
            <strong>$ {{ close.tax | number:'1.2-2' }}</strong>
          </div>
          <div class="metric fee">
            <span>Cargo extra</span>
            <strong>$ {{ close.extraFee | number:'1.2-2' }}</strong>
          </div>
          <div class="metric total">
            <span>Total cobrado</span>
            <strong>$ {{ close.totalPayment | number:'1.2-2' }}</strong>
          </div>
        </section>

        <section class="payments-section">
          <div class="section-heading">
            <div>
              <h3>Métodos de cobro</h3>
              <span>{{ close.orderCount }} órdenes · {{ close.guestCount }} clientes</span>
            </div>
            <strong>{{ close.payments.length }} movimientos</strong>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Método</th><th class="right">Operaciones</th><th class="right">Monto</th></tr></thead>
              <tbody>
                @for (payment of close.payments; track payment.method) {
                  <tr>
                    <td><span class="payment-icon"><mat-icon>{{ paymentIcon(payment.method) }}</mat-icon></span>{{ payment.name }}</td>
                    <td class="right muted">{{ payment.count }}</td>
                    <td class="right amount">$ {{ payment.amount | number:'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
              <tfoot><tr><td>Total conciliado</td><td></td><td class="right">$ {{ close.totalPayment | number:'1.2-2' }}</td></tr></tfoot>
            </table>
          </div>
        </section>

        <div class="confirm-row">
          <div>
            <strong>{{ selectedLocalName() || 'Selecciona un local' }}</strong>
            <span>{{ close.payments.length }} transacciones con fecha {{ close.endDate | date:'dd/MM/yyyy' }}</span>
          </div>
          <button type="button" class="import-button" (click)="importClosing()"
            [disabled]="!selectedLocalId || close.alreadyImported || importing()">
            @if (importing()) { <span class="spinner dark"></span> } @else { <mat-icon>save</mat-icon> }
            {{ importing() ? 'Registrando…' : 'Grabar transacciones' }}
          </button>
        </div>
      }

      @if (recent().length) {
        <section class="recent-section">
          <div class="section-heading"><h3>Cierres importados</h3><span>Últimos {{ recent().length }}</span></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Fecha cierre</th><th>Local</th><th>Archivo</th><th class="right">Mov.</th><th class="right">Total</th></tr></thead>
              <tbody>
                @for (item of recent(); track item.id) {
                  <tr>
                    <td>{{ item.closingDate | date:'dd/MM/yyyy' }}</td>
                    <td>{{ item.localName }}</td>
                    <td class="muted">{{ item.fileName }}</td>
                    <td class="right muted">{{ item.transactionCount }}</td>
                    <td class="right amount">$ {{ item.totalPayment | number:'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1120px; margin: 0 auto; padding-bottom: 44px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
    .page-header h1 { display: flex; align-items: center; gap: 10px; font-family: var(--pc-font-heading); font-size: 1.75rem; margin: 0 0 4px; }
    .page-header h1 mat-icon { color: var(--pc-yellow); }
    .page-header p { color: var(--pc-text-muted); font-size: .9rem; margin: 0; }
    .secondary-action { display: inline-flex; align-items: center; gap: 7px; color: var(--pc-text-primary); border: 1px solid var(--pc-border); padding: 9px 14px; border-radius: 6px; text-decoration: none; font-size: .85rem; }
    .secondary-action:hover { border-color: var(--pc-yellow); color: var(--pc-yellow); }
    .secondary-action mat-icon { font-size: 19px; width: 19px; height: 19px; }

    .success-band, .error-band { display: flex; align-items: center; gap: 12px; border-radius: 6px; padding: 13px 16px; margin-bottom: 16px; }
    .success-band { background: rgba(16,185,129,.1); border: 1px solid rgba(52,211,153,.35); color: #6ee7b7; }
    .success-band > mat-icon { color: #34d399; }
    .success-band div { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .success-band span { color: var(--pc-text-secondary); font-size: .82rem; }
    .icon-button { border: 0; background: transparent; color: #34d399; cursor: pointer; width: 36px; height: 36px; }
    .error-band { background: rgba(239,68,68,.1); border: 1px solid rgba(248,113,113,.3); color: #fca5a5; font-size: .88rem; }

    .import-tool { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 14px; align-items: stretch; margin-bottom: 18px; }
    .drop-zone { min-height: 92px; display: grid; grid-template-columns: 42px minmax(0,1fr) auto; align-items: center; gap: 14px; border: 1px dashed var(--pc-border); border-radius: 8px; padding: 16px; background: rgba(255,255,255,.025); }
    .drop-zone.dragging { border-color: var(--pc-yellow); background: rgba(242,201,76,.06); }
    .drop-zone.has-file { border-style: solid; border-color: rgba(248,113,113,.32); }
    .drop-zone > mat-icon { color: #f87171; font-size: 34px; width: 34px; height: 34px; }
    .drop-zone input { display: none; }
    .file-copy { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .file-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-copy span { color: var(--pc-text-muted); font-size: .78rem; }
    .select-button { background: rgba(255,255,255,.05); color: var(--pc-text-primary); border: 1px solid var(--pc-border); border-radius: 6px; padding: 9px 13px; cursor: pointer; }
    .select-button:hover { border-color: var(--pc-yellow); }
    .location-field { border: 1px solid var(--pc-border); border-radius: 8px; padding: 13px 15px; background: rgba(0,0,0,.16); }
    .location-field > span { display: block; color: var(--pc-text-muted); font-size: .75rem; margin-bottom: 9px; text-transform: uppercase; }
    .location-field > div { display: flex; align-items: center; gap: 8px; }
    .location-field mat-icon { color: var(--pc-yellow); }
    .location-field select { width: 100%; min-width: 0; background: transparent; color: var(--pc-text-primary); border: 0; outline: 0; font: inherit; }
    .location-field option { background: var(--pc-bg-sidebar); }
    .status-row { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 28px; color: var(--pc-text-muted); }
    .spinner { width: 17px; height: 17px; border: 2px solid rgba(255,255,255,.2); border-top-color: var(--pc-yellow); border-radius: 50%; animation: spin .7s linear infinite; }
    .spinner.dark { border-color: rgba(0,0,0,.25); border-top-color: #111827; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .closing-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding: 20px 4px 17px; border-bottom: 1px solid var(--pc-border); }
    .eyebrow { color: var(--pc-yellow); font-size: .75rem; text-transform: uppercase; }
    .closing-header h2 { margin: 4px 0 10px; font-size: 1.25rem; text-transform: capitalize; }
    .meta { display: flex; gap: 16px; flex-wrap: wrap; color: var(--pc-text-muted); font-size: .8rem; }
    .meta span { display: inline-flex; align-items: center; gap: 4px; }
    .meta mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .reconciled { display: inline-flex; align-items: center; gap: 7px; color: #34d399; background: rgba(16,185,129,.1); border: 1px solid rgba(52,211,153,.3); border-radius: 6px; padding: 8px 11px; font-size: .78rem; font-weight: 700; }
    .reconciled.duplicate { color: #fbbf24; background: rgba(245,158,11,.1); border-color: rgba(251,191,36,.3); }
    .reconciled mat-icon { font-size: 17px; width: 17px; height: 17px; }

    .metrics-grid { display: grid; grid-template-columns: repeat(4,1fr); border-bottom: 1px solid var(--pc-border); }
    .metric { padding: 18px 16px; border-right: 1px solid var(--pc-border); }
    .metric:last-child { border-right: 0; }
    .metric span { display: block; color: var(--pc-text-muted); font-size: .74rem; text-transform: uppercase; margin-bottom: 6px; }
    .metric strong { font-family: var(--pc-font-heading); font-size: 1.15rem; color: #6ee7b7; }
    .metric.tax strong { color: #93c5fd; }
    .metric.fee strong { color: #fbbf24; }
    .metric.total { background: rgba(242,201,76,.055); }
    .metric.total strong { color: var(--pc-yellow); }

    .payments-section, .recent-section { padding: 20px 0; border-bottom: 1px solid var(--pc-border); }
    .recent-section { margin-top: 20px; border-top: 1px solid var(--pc-border); }
    .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 12px; }
    .section-heading h3 { margin: 0; font-size: 1rem; }
    .section-heading div span, .section-heading > span { color: var(--pc-text-muted); font-size: .78rem; }
    .section-heading > strong { color: var(--pc-yellow); font-size: .78rem; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: .84rem; }
    th { color: var(--pc-text-muted); font-size: .72rem; font-weight: 500; text-transform: uppercase; text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--pc-border); }
    td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.045); }
    td:first-child { display: flex; align-items: center; gap: 9px; }
    .right { text-align: right; }
    .muted { color: var(--pc-text-muted); }
    .amount { color: #6ee7b7; font-weight: 650; }
    .payment-icon { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; color: #93c5fd; background: rgba(59,130,246,.1); border-radius: 5px; }
    .payment-icon mat-icon { font-size: 17px; width: 17px; height: 17px; }
    tfoot td { border-top: 1px solid var(--pc-border); border-bottom: 0; font-weight: 750; color: var(--pc-yellow); }
    .confirm-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 18px 0; }
    .confirm-row > div { display: flex; flex-direction: column; gap: 3px; }
    .confirm-row span { color: var(--pc-text-muted); font-size: .78rem; }
    .import-button { display: inline-flex; align-items: center; gap: 8px; background: var(--pc-yellow); color: #111827; border: 0; border-radius: 6px; padding: 11px 17px; font-weight: 750; cursor: pointer; }
    .import-button:disabled { opacity: .45; cursor: not-allowed; }
    .import-button mat-icon { font-size: 19px; width: 19px; height: 19px; }

    @media (max-width: 760px) {
      .page-header { align-items: flex-start; }
      .import-tool { grid-template-columns: 1fr; }
      .metrics-grid { grid-template-columns: 1fr 1fr; }
      .metric:nth-child(2) { border-right: 0; }
      .metric { border-bottom: 1px solid var(--pc-border); }
      .drop-zone { grid-template-columns: 36px minmax(0,1fr); }
      .select-button { grid-column: 1 / -1; }
      .closing-header, .confirm-row { align-items: stretch; flex-direction: column; }
      .import-button { justify-content: center; }
    }
  `]
})
export class CashCloseImportComponent implements OnInit {
  private accounting = inject(AccountingService);

  locations = this.accounting.locations;
  selectedFile = signal<File | null>(null);
  preview = signal<CashClosingPreview | null>(null);
  recent = signal<CashClosingImportRecord[]>([]);
  result = signal<CashClosingImportResult | null>(null);
  loading = signal(false);
  importing = signal(false);
  dragging = signal(false);
  error = signal('');
  selectedLocalId = '';

  async ngOnInit() {
    await this.accounting.loadAll();
    await this.loadRecent();
  }

  onFileInput(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.useFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.useFile(file);
  }

  async useFile(file: File) {
    this.error.set('');
    this.result.set(null);
    this.preview.set(null);
    if (!file.name.toLowerCase().endsWith('.pdf') || file.type && file.type !== 'application/pdf') {
      this.error.set('Selecciona un archivo PDF válido.');
      return;
    }
    if (file.size > 1_000_000) {
      this.error.set('El PDF no puede superar 1 MB.');
      return;
    }

    this.selectedFile.set(file);
    this.loading.set(true);
    try {
      const preview = await this.accounting.previewCashClosing(file);
      this.preview.set(preview);
      this.selectedLocalId = preview.suggestedLocalId || this.selectedLocalId || this.locations()[0]?.id || '';
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async importClosing() {
    const file = this.selectedFile();
    if (!file || !this.selectedLocalId || !this.preview() || this.preview()!.alreadyImported) return;
    this.error.set('');
    this.importing.set(true);
    try {
      const result = await this.accounting.importCashClosing(file, this.selectedLocalId);
      this.result.set(result);
      this.preview.update(value => value ? { ...value, alreadyImported: true } : value);
      await this.loadRecent();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.importing.set(false);
    }
  }

  reset() {
    this.selectedFile.set(null);
    this.preview.set(null);
    this.result.set(null);
    this.error.set('');
  }

  selectedLocalName() {
    return this.locations().find(location => location.id === this.selectedLocalId)?.name || '';
  }

  paymentIcon(method: string) {
    return method === 'efectivo' ? 'payments' : method.includes('online') ? 'language' : 'credit_card';
  }

  formatBytes(bytes: number) {
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  }

  private async loadRecent() {
    try { this.recent.set(await this.accounting.getClosingImports()); }
    catch { this.recent.set([]); }
  }

  private errorMessage(error: unknown) {
    if (error instanceof HttpErrorResponse) {
      return error.error?.title || error.error?.detail || 'No se pudo procesar el cierre.';
    }
    return 'No se pudo procesar el cierre.';
  }
}
