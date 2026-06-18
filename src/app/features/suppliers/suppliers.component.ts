import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { Supplier } from '../../core/models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="suppliers-page animate-fade-in-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">local_shipping</mat-icon> Gestión de Proveedores</h1>
          <p>Administra la lista de proveedores autorizados y su información de contacto.</p>
        </div>
        <div class="header-actions">
          <button (click)="openForm()" class="btn-primary">
            <mat-icon>add</mat-icon>
            <span>Nuevo Proveedor</span>
          </button>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="filter-section">
        <div class="search-box">
          <mat-icon class="search-icon">search</mat-icon>
          <input 
            type="text" 
            [(ngModel)]="searchTerm"
            placeholder="Buscar por nombre, contacto o correo..." 
            class="search-input"
          >
        </div>
      </div>

      <!-- Suppliers Grid/Table -->
      <div class="activity-section animate-fade-in-up">
        <div class="section-header">
          <h3><mat-icon>business</mat-icon> Directorio de Proveedores</h3>
          <span class="view-all-link">{{ filteredSuppliers().length }} proveedores</span>
        </div>
        <div class="activity-table">
          <div class="activity-header-row">
            <span class="ath">Empresa</span>
            <span class="ath">Contacto</span>
            <span class="ath">Información</span>
            <span class="ath">Estado</span>
            <span class="ath ath-right">Acciones</span>
          </div>
          
          @if (filteredSuppliers().length === 0) {
            <div class="activity-empty">
              <mat-icon>local_shipping</mat-icon>
              <p>No se encontraron proveedores</p>
            </div>
          } @else {
            @for (supplier of filteredSuppliers(); track supplier.id) {
              <div class="activity-row">
                <span class="atd atd-name">
                  <div class="supplier-avatar">{{ supplier.name.charAt(0).toUpperCase() }}</div>
                  {{ supplier.name }}
                </span>
                <span class="atd">{{ supplier.contactName || 'No especificado' }}</span>
                <span class="atd">
                  <div class="contact-info">
                    @if (supplier.phone) {
                      <div class="contact-item"><mat-icon>phone</mat-icon> {{ supplier.phone }}</div>
                    }
                    @if (supplier.email) {
                      <div class="contact-item"><mat-icon>mail</mat-icon> {{ supplier.email }}</div>
                    }
                  </div>
                </span>
                <span class="atd">
                  <span class="status-badge" [class.active]="supplier.active" [class.inactive]="!supplier.active">
                    {{ supplier.active ? 'Activo' : 'Inactivo' }}
                  </span>
                </span>
                <span class="atd atd-right action-buttons">
                  <button (click)="openForm(supplier)" class="action-btn edit-btn" title="Editar">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button (click)="deleteSupplier(supplier)" class="action-btn delete-btn" title="Eliminar">
                    <mat-icon>delete</mat-icon>
                  </button>
                </span>
              </div>
            }
          }
        </div>
      </div>
    </div>

    <!-- Supplier Form Modal -->
    @if (showForm()) {
      <div class="modal-overlay animate-fade-in">
        <div class="modal-content animate-slide-up">
          <div class="modal-header">
            <h3>{{ editingSupplier() ? 'Editar Proveedor' : 'Nuevo Proveedor' }}</h3>
            <button (click)="closeForm()" class="close-btn"><mat-icon>close</mat-icon></button>
          </div>

          <form (ngSubmit)="saveSupplier()" class="modal-body">
            <div class="form-group">
              <label>Nombre de la Empresa *</label>
              <input type="text" [(ngModel)]="formData.name" name="name" required class="pc-input" placeholder="Ej. Distribuidora S.A.">
            </div>

            <div class="form-group">
              <label>Nombre del Contacto</label>
              <input type="text" [(ngModel)]="formData.contactName" name="contactName" class="pc-input" placeholder="Ej. Juan Pérez">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Teléfono</label>
                <input type="text" [(ngModel)]="formData.phone" name="phone" class="pc-input" placeholder="Ej. 555-0123">
              </div>
              <div class="form-group">
                <label>Correo Electrónico</label>
                <input type="email" [(ngModel)]="formData.email" name="email" class="pc-input" placeholder="ejemplo@empresa.com">
              </div>
            </div>

            <div class="form-group checkbox-group">
              <label class="checkbox-container">
                <input type="checkbox" [(ngModel)]="formData.active" name="active">
                <span class="checkmark"></span>
                Proveedor Activo
              </label>
            </div>

            <div class="form-group">
              <label>Notas</label>
              <textarea [(ngModel)]="formData.notes" name="notes" rows="3" class="pc-input" placeholder="Condiciones de pago, días de entrega..."></textarea>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="closeForm()" class="btn-secondary">Cancelar</button>
              <button type="submit" class="btn-primary" [disabled]="!formData.name">
                <mat-icon>check</mat-icon> <span>Guardar Proveedor</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .suppliers-page {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* ---- Header ---- */
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

    /* ---- Filters ---- */
    .filter-section {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      padding: 16px;
      margin-bottom: 24px;
      display: flex;
      gap: 16px;
    }

    .search-box {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: var(--pc-text-muted);
      font-size: 20px;
    }

    .search-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-md);
      padding: 10px 12px 10px 40px;
      color: var(--pc-text-primary);
      font-family: var(--pc-font-body);
      font-size: 0.9rem;
      transition: all var(--pc-transition-fast);
    }

    .search-input:focus {
      outline: none;
      border-color: var(--pc-yellow);
      background: rgba(0, 0, 0, 0.3);
    }

    /* ---- Activity Table ---- */
    .activity-section {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      overflow: hidden;
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--pc-border);
    }

    .section-header h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      font-family: var(--pc-font-heading);
    }

    .section-header h3 mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--pc-yellow);
    }

    .view-all-link {
      color: var(--pc-text-muted);
      font-size: 0.82rem;
      font-weight: 500;
    }

    .activity-header-row {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1.5fr 0.8fr 0.8fr;
      padding: 12px 20px;
      background: rgba(0, 0, 0, 0.2);
    }

    .ath {
      font-size: 0.72rem;
      color: var(--pc-text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .ath-right { text-align: right; }

    .activity-row {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1.5fr 0.8fr 0.8fr;
      padding: 16px 20px;
      border-bottom: 1px solid var(--pc-border);
      align-items: center;
      transition: background var(--pc-transition-fast);
    }

    .activity-row:last-child { border-bottom: none; }
    .activity-row:hover { background: rgba(255, 255, 255, 0.02); }

    .atd { font-size: 0.88rem; color: var(--pc-text-secondary); }
    .atd-right { text-align: right; }

    .atd-name {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
      color: var(--pc-text-primary);
    }

    .supplier-avatar {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(242, 201, 76, 0.15);
      color: var(--pc-yellow);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.1rem;
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
    }

    .contact-item mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: var(--pc-text-muted);
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
      display: inline-flex;
    }

    .status-badge.active {
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
    }

    .status-badge.inactive {
      background: rgba(244, 63, 94, 0.15);
      color: #FB7185;
    }

    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .action-btn {
      background: transparent;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all var(--pc-transition-fast);
      color: var(--pc-text-muted);
    }

    .action-btn:hover { background: rgba(255, 255, 255, 0.05); }
    .edit-btn:hover { color: var(--pc-yellow); }
    .delete-btn:hover { color: var(--pc-red); }

    .activity-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
      gap: 8px;
    }

    .activity-empty mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      opacity: 0.3;
    }

    /* ---- Modals ---- */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 15, 26, 0.8);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-content {
      background: var(--pc-bg-sidebar);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      width: 100%;
      max-width: 500px;
      box-shadow: var(--pc-shadow-xl);
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--pc-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-header h3 {
      font-family: var(--pc-font-heading);
      font-size: 1.2rem;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--pc-text-muted);
      cursor: pointer;
      display: flex;
      padding: 4px;
      border-radius: 4px;
      transition: all var(--pc-transition-fast);
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--pc-text-primary);
    }

    .modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-group label {
      font-size: 0.85rem;
      color: var(--pc-text-secondary);
      font-weight: 500;
    }

    .pc-input {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-md);
      padding: 10px 12px;
      color: var(--pc-text-primary);
      font-family: var(--pc-font-body);
      transition: all var(--pc-transition-fast);
    }

    .pc-input:focus {
      outline: none;
      border-color: var(--pc-yellow);
      background: rgba(0, 0, 0, 0.3);
    }

    .checkbox-container {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }

    .modal-footer {
      padding-top: 24px;
      margin-top: 8px;
      border-top: 1px solid var(--pc-border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--pc-border);
      color: var(--pc-text-primary);
      padding: 8px 16px;
      border-radius: var(--pc-radius-md);
      cursor: pointer;
      font-weight: 500;
      transition: all var(--pc-transition-fast);
    }

    .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); }

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

    .btn-primary:hover:not(:disabled) {
      background: #FBBF24;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(242, 201, 76, 0.2);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      filter: grayscale(1);
    }
  `]
})
export class SuppliersComponent {
  private dataService = inject(DataService);

  searchTerm = signal('');
  showForm = signal(false);
  editingSupplier = signal<Supplier | null>(null);

  formData: Partial<Supplier> = this.getInitialFormData();

  filteredSuppliers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let list = this.dataService.suppliers();

    if (term) {
      list = list.filter(s => 
        s.name.toLowerCase().includes(term) ||
        s.contactName?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term)
      );
    }

    return list;
  });

  private getInitialFormData(): Partial<Supplier> {
    return {
      name: '',
      contactName: '',
      phone: '',
      email: '',
      active: true,
      notes: ''
    };
  }

  openForm(supplier?: Supplier) {
    if (supplier) {
      this.editingSupplier.set(supplier);
      this.formData = { ...supplier };
    } else {
      this.editingSupplier.set(null);
      this.formData = this.getInitialFormData();
    }
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingSupplier.set(null);
    this.formData = this.getInitialFormData();
  }

  saveSupplier() {
    if (!this.formData.name) return;

    if (this.editingSupplier()) {
      this.dataService.updateSupplier(this.editingSupplier()!.id, this.formData);
    } else {
      this.dataService.addSupplier(this.formData as Omit<Supplier, 'id'>);
    }

    this.closeForm();
  }

  deleteSupplier(supplier: Supplier) {
    if (confirm(`¿Estás seguro de que deseas eliminar el proveedor "${supplier.name}"?`)) {
      this.dataService.deleteSupplier(supplier.id);
    }
  }
}
