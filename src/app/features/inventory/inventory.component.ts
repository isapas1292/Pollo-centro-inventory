import { Component, computed, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';
import { Product, ProductCategory, ProductUnit, CATEGORY_LABELS, UNIT_LABELS, Supplier, Location } from '../../core/models';

@Component({
  selector: 'app-inventory',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  template: `
    <div class="inventory animate-fade-in-up">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-text">
          <h1>Inventario</h1>
          <p>Gestiona todos los productos y materiales de tu inventario</p>
        </div>
        @if (auth.hasPermission('inventory.create')) {
          <button class="btn-add" (click)="openAddModal()" id="btn-add-product">
            <mat-icon>add</mat-icon>
            Nuevo Producto
          </button>
        }
      </div>

      <!-- Stats Bar -->
      <div class="stats-bar stagger-children">
        <div class="stat-card animate-fade-in-up" id="stat-total">
          <div class="stat-icon stat-blue"><mat-icon>inventory_2</mat-icon></div>
          <div class="stat-content">
            <span class="stat-value">{{ totalProducts() }}</span>
            <span class="stat-label">Total Productos</span>
          </div>
        </div>
        <div class="stat-card animate-fade-in-up" id="stat-ok">
          <div class="stat-icon stat-green"><mat-icon>check_circle</mat-icon></div>
          <div class="stat-content">
            <span class="stat-value">{{ stockOkCount() }}</span>
            <span class="stat-label">Stock OK</span>
          </div>
        </div>
        <div class="stat-card animate-fade-in-up" id="stat-low">
          <div class="stat-icon stat-orange"><mat-icon>warning</mat-icon></div>
          <div class="stat-content">
            <span class="stat-value">{{ lowStockCount() }}</span>
            <span class="stat-label">Stock Bajo</span>
          </div>
        </div>
        <div class="stat-card animate-fade-in-up" id="stat-value">
          <div class="stat-icon stat-purple"><mat-icon>attach_money</mat-icon></div>
          <div class="stat-content">
            <span class="stat-value">\${{ totalValue().toFixed(2) }}</span>
            <span class="stat-label">Valor Total</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar animate-fade-in-up">
        <div class="filter-row-top">
          <div class="date-info">
            <span class="date-text">{{ currentDate() | date:'MM/dd/yyyy' }}</span>
            <span class="total-text">Total: {{ totalValue() | currency }}</span>
            <span class="alert-text"><mat-icon>help</mat-icon> Stock Bajo: {{ lowStockCount() }}</span>
          </div>
          <div class="dropdowns-group">
            <select class="custom-select" [ngModel]="selectedCategory()" (ngModelChange)="selectedCategory.set($event)">
              <option value="all">Todas las Categorías</option>
              @for (cat of uniqueCategories(); track cat) {
                <option [value]="cat">{{ cat }}</option>
              }
            </select>
            
            <select class="custom-select" [ngModel]="selectedLocation()" (ngModelChange)="selectedLocation.set($event)">
              <option value="all">Select Location</option>
              @for (loc of dataService.locations(); track loc.id) {
                <option [value]="loc.id">{{ loc.name }}</option>
              }
            </select>

            <select class="custom-select" [ngModel]="selectedVendor()" (ngModelChange)="selectedVendor.set($event)">
              <option value="all">Select Vendor</option>
              @for (sup of dataService.suppliers(); track sup.id) {
                <option [value]="sup.id">{{ sup.name }}</option>
              }
            </select>
          </div>
        </div>

        <div class="search-wrap mt-3">
          <mat-icon class="search-icon">search</mat-icon>
          <input type="text"
                 class="search-input"
                 placeholder="Buscar producto..."
                 [ngModel]="searchQuery()"
                 (ngModelChange)="searchQuery.set($event)"
                 id="search-product">
        </div>
      </div>

      <!-- Product Table -->
      <div class="table-container animate-fade-in-up">
        <div class="table-header-row">
          <span class="th th-name">Producto</span>
          <span class="th th-category">Categoría</span>
          <span class="th th-stock">Stock Actual</span>
          <span class="th th-min">Mínimo</span>
          <span class="th th-unit">Unidad</span>
          <span class="th th-supplier">Proveedor</span>
          <span class="th th-price">Precio</span>
          <span class="th th-updated">Actualizado</span>
          <span class="th th-actions">Acciones</span>
        </div>
        @if (filteredProducts().length === 0) {
          <div class="empty-state">
            <mat-icon>search_off</mat-icon>
            <p>No se encontraron productos</p>
            <span>Intenta cambiar los filtros de búsqueda</span>
          </div>
        } @else {
          @for (product of paginatedProducts(); track product.id) {
            <div class="table-row" [class.row-critical]="product.currentStock <= product.minStock * 0.5"
                 [class.row-warning]="product.currentStock > product.minStock * 0.5 && product.currentStock <= product.minStock">
              <span class="td td-name">
                <div class="product-name-wrap">
                  <span class="product-name">{{ product.name }}</span>
                </div>
              </span>
              <span class="td td-category">
                <span class="category-badge" [style.background]="getCategoryColor(product.category).bg" [style.color]="getCategoryColor(product.category).color">
                  {{ product.category }}
                </span>
              </span>
              <span class="td td-stock">
                <div class="stock-visual">
                  <div class="stock-bar-container">
                    <div class="stock-bar-fill"
                         [style.width.%]="getStockPercent(product)"
                         [class.fill-ok]="product.currentStock > product.minStock"
                         [class.fill-warning]="product.currentStock <= product.minStock && product.currentStock > product.minStock * 0.5"
                         [class.fill-critical]="product.currentStock <= product.minStock * 0.5">
                    </div>
                  </div>
                  <span class="stock-number" [class.text-green]="product.currentStock > product.minStock"
                        [class.text-orange]="product.currentStock <= product.minStock && product.currentStock > product.minStock * 0.5"
                        [class.text-red]="product.currentStock <= product.minStock * 0.5">
                    {{ product.currentStock }}
                  </span>
                </div>
                <span class="stock-status-badge"
                      [class.badge-ok]="product.currentStock > product.minStock"
                      [class.badge-warning]="product.currentStock <= product.minStock && product.currentStock > product.minStock * 0.5"
                      [class.badge-critical]="product.currentStock <= product.minStock * 0.5">
                  {{ getStockStatusText(product) }}
                </span>
              </span>
              <span class="td td-min">{{ product.minStock }}</span>
              <span class="td td-unit">{{ getUnitLabel(product.unit) }}</span>
              <span class="td td-supplier">{{ product.supplierName || '-' }}</span>
              <span class="td td-price">\${{ product.currentPrice.toFixed(2) }}</span>
              <span class="td td-updated">{{ formatDate(product.lastUpdated) }}</span>
              <span class="td td-actions">
                @if (auth.hasPermission('inventory.edit')) {
                  <button class="action-btn restock-btn" (click)="openRestockModal(product)" matTooltip="Introducir stock">
                    <mat-icon>add_box</mat-icon>
                  </button>
                  <button class="action-btn edit-btn" (click)="openEditModal(product)" matTooltip="Editar">
                    <mat-icon>edit</mat-icon>
                  </button>
                }
                @if (auth.hasPermission('inventory.delete')) {
                  <button class="action-btn delete-btn" (click)="openDeleteModal(product)" matTooltip="Eliminar">
                    <mat-icon>delete</mat-icon>
                  </button>
                }
              </span>
            </div>
          }
        }

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="pagination">
            <span class="page-info">
              Mostrando {{ paginationStart() + 1 }}-{{ paginationEnd() }} de {{ filteredProducts().length }}
            </span>
            <div class="page-buttons">
              <button class="page-btn" [disabled]="currentPage() <= 1" (click)="currentPage.set(currentPage() - 1)">
                <mat-icon>chevron_left</mat-icon>
              </button>
              @for (page of visiblePages(); track page) {
                <button class="page-btn" [class.active]="currentPage() === page" (click)="currentPage.set(page)">
                  {{ page }}
                </button>
              }
              <button class="page-btn" [disabled]="currentPage() >= totalPages()" (click)="currentPage.set(currentPage() + 1)">
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Add/Edit Modal Overlay -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingProduct() ? 'Editar Producto' : 'Nuevo Producto' }}</h2>
            <button class="modal-close" (click)="closeModal()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Nombre <span class="req">*</span></label>
              <input type="text" class="form-input" [class.input-error]="formSubmitted && !formName.trim()"
                     [(ngModel)]="formName" placeholder="Nombre del producto" id="input-product-name">
              @if (formSubmitted && !formName.trim()) {
                <span class="field-error">El nombre es obligatorio</span>
              }
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Categoría</label>
                <select class="form-input" [(ngModel)]="formCategory" id="input-product-category">
                  @for (cat of uniqueCategories(); track cat) {
                    <option [value]="cat">{{ cat }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Unidad</label>
                <select class="form-input" [(ngModel)]="formUnit" id="input-product-unit">
                  <option value="kg">Kilogramos</option>
                  <option value="lb">Libras</option>
                  <option value="unidad">Unidades</option>
                  <option value="litro">Litros</option>
                  <option value="paquete">Paquetes</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Stock Actual</label>
                <input type="number" class="form-input" [(ngModel)]="formStock" min="0" id="input-product-stock">
              </div>
              <div class="form-group">
                <label>Stock Mínimo</label>
                <input type="number" class="form-input" [(ngModel)]="formMinStock" min="0" id="input-product-minstock">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Precio Actual (\$)</label>
                <input type="number" class="form-input" [(ngModel)]="formPrice" min="0" step="0.01" id="input-product-price">
              </div>
              <div class="form-group">
                <label>Proveedor</label>
                <select class="form-input" [(ngModel)]="formSupplierId">
                  <option value="">Seleccionar Proveedor</option>
                  @for (sup of dataService.suppliers(); track sup.id) {
                    <option [value]="sup.id">{{ sup.name }}</option>
                  }
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" (click)="closeModal()">Cancelar</button>
            <button class="btn-save" (click)="saveProduct()" id="btn-save-product">
              <mat-icon>{{ editingProduct() ? 'save' : 'add' }}</mat-icon>
              {{ editingProduct() ? 'Guardar Cambios' : 'Crear Producto' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (showRestockModal()) {
      <div class="modal-overlay" (click)="closeRestockModal()">
        <div class="modal-content modal-restock" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><mat-icon>add_box</mat-icon> Introducir Stock</h2>
            <button class="modal-close" (click)="closeRestockModal()"><mat-icon>close</mat-icon></button>
          </div>
          <div class="modal-body">
            <div class="restock-product">{{ restockingProduct()?.name }}</div>
            <div class="restock-summary">
              <span>Stock actual <strong>{{ restockingProduct()?.currentStock }} {{ getUnitLabel(restockingProduct()?.unit || 'unidad') }}</strong></span>
              <mat-icon>arrow_forward</mat-icon>
              <span>Stock resultante <strong>{{ restockResult() }} {{ getUnitLabel(restockingProduct()?.unit || 'unidad') }}</strong></span>
            </div>
            <div class="form-group">
              <label>Cantidad que llegó</label>
              <input type="number" class="form-input" [(ngModel)]="restockQuantity" min="0.01" step="0.01" autofocus>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" (click)="closeRestockModal()">Cancelar</button>
            <button class="btn-save" (click)="confirmRestock()" [disabled]="restockQuantity <= 0">
              <mat-icon>inventory</mat-icon> Agregar al Inventario
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete Modal -->
    @if (showDeleteModal()) {
      <div class="modal-overlay" (click)="closeDeleteModal()">
        <div class="modal-content modal-delete" (click)="$event.stopPropagation()">
          <div class="modal-header delete-header">
            <h2><mat-icon class="text-red">warning</mat-icon> Confirmar Eliminación</h2>
            <button class="modal-close" (click)="closeDeleteModal()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-msg">¿Estás seguro de que deseas eliminar <strong>{{ deletingProduct()?.name }}</strong>?</p>
            <p class="delete-warning">Esta acción no se puede deshacer.</p>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" (click)="closeDeleteModal()">Cancelar</button>
            <button class="btn-delete" (click)="confirmDelete()" id="btn-confirm-delete">
              <mat-icon>delete</mat-icon>
              Eliminar
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .inventory {
      max-width: 1750px;
      margin: 0 auto;
    }

    /* ---- Page Header ---- */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .page-header h1 {
      font-family: var(--pc-font-heading);
      font-size: 1.8rem;
      margin-bottom: 4px;
    }

    .page-header p {
      color: var(--pc-text-muted);
      font-size: 0.9rem;
    }

    .btn-add {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: linear-gradient(135deg, var(--pc-yellow), var(--pc-yellow-dark));
      color: #1A1A2E;
      border: none;
      border-radius: var(--pc-radius-sm);
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      transition: all var(--pc-transition-fast);
      font-family: var(--pc-font-body);
    }

    .btn-add:hover {
      box-shadow: var(--pc-shadow-glow);
      transform: translateY(-2px);
    }

    .btn-add mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* ---- Stats Bar ---- */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.8), rgba(26, 26, 46, 0.6));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-md);
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      transition: all var(--pc-transition-normal);
    }

    .stat-card:hover {
      border-color: var(--pc-border-active);
      transform: translateY(-2px);
    }

    .stat-icon {
      width: 42px;
      height: 42px;
      border-radius: var(--pc-radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon mat-icon { color: white; font-size: 22px; }
    .stat-blue { background: linear-gradient(135deg, #3B82F6, #2563EB); }
    .stat-green { background: linear-gradient(135deg, #43A047, #2E7D32); }
    .stat-orange { background: linear-gradient(135deg, #FB8C00, #E65100); }
    .stat-purple { background: linear-gradient(135deg, #7C3AED, #5B21B6); }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-family: var(--pc-font-heading);
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--pc-text-primary);
      line-height: 1;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--pc-text-muted);
      margin-top: 2px;
    }

    .filters-bar {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      padding: 16px 20px;
      margin-bottom: 20px;
    }

    .filter-row-top {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .date-info {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 0.9rem;
      font-weight: 600;
    }
    
    .date-text { color: var(--pc-yellow); }
    .total-text { color: var(--pc-text-primary); }
    .alert-text { color: #10B981; display: flex; align-items: center; gap: 4px; }
    .alert-text mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .dropdowns-group {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .custom-select {
      appearance: none;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-md);
      padding: 8px 32px 8px 12px;
      font-size: 0.85rem;
      color: var(--pc-text-primary);
      font-family: var(--pc-font-body);
      font-weight: 500;
      outline: none;
      cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F2C94C'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 16px;
      min-width: 140px;
      transition: all var(--pc-transition-fast);
    }
    
    .custom-select:focus {
      border-color: var(--pc-yellow);
    }
    
    .custom-select option {
      background: var(--pc-bg-sidebar);
      color: white;
    }

    .search-wrap {
      position: relative;
      max-width: 400px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--pc-text-muted);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .search-input {
      width: 100%;
      padding: 10px 14px 10px 40px;
      background: var(--pc-bg-input);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-sm);
      color: var(--pc-text-primary);
      font-size: 0.88rem;
      font-family: var(--pc-font-body);
      outline: none;
      transition: border-color var(--pc-transition-fast);
    }

    .search-input::placeholder { color: var(--pc-text-muted); }
    .search-input:focus { border-color: var(--pc-yellow); }

    .filter-chips {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .filter-label {
      font-size: 0.78rem;
      color: var(--pc-text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      min-width: 70px;
    }

    .filter-chip {
      padding: 5px 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--pc-border);
      border-radius: 20px;
      color: var(--pc-text-secondary);
      font-size: 0.8rem;
      font-family: var(--pc-font-body);
      cursor: pointer;
      transition: all var(--pc-transition-fast);
    }

    .filter-chip:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--pc-text-primary);
    }

    .filter-chip.active {
      background: rgba(242, 201, 76, 0.15);
      border-color: var(--pc-yellow);
      color: var(--pc-yellow);
      font-weight: 600;
    }

    /* ---- Table ---- */
    .table-container {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      backdrop-filter: blur(16px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      overflow: hidden;
    }

    .table-header-row {
      display: grid;
      grid-template-columns: 2.2fr 1.3fr 0.8fr 0.6fr 0.7fr 1.5fr 0.7fr 0.8fr 0.9fr;
      padding: 14px 20px;
      border-bottom: 1px solid var(--pc-border);
      background: rgba(0, 0, 0, 0.2);
    }

    .th {
      font-size: 0.72rem;
      color: var(--pc-text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .table-row {
      display: grid;
      grid-template-columns: 2.2fr 1.3fr 0.8fr 0.6fr 0.7fr 1.5fr 0.7fr 0.8fr 0.9fr;
      padding: 14px 20px;
      border-bottom: 1px solid var(--pc-border);
      align-items: center;
      transition: background var(--pc-transition-fast);
    }

    .table-row:last-child { border-bottom: none; }
    .table-row:hover { background: rgba(255, 255, 255, 0.03); }
    .table-row.row-warning { border-left: 3px solid var(--pc-orange); }
    .table-row.row-critical { border-left: 3px solid var(--pc-red); }

    .td { 
      font-size: 0.88rem; 
      color: var(--pc-text-secondary); 
      min-width: 0; /* Ensures text-overflow works in grid */
    }
    .td-min { text-align: center; }
    
    .td-supplier {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .td-name {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .product-name {
      font-weight: 600;
      color: var(--pc-text-primary);
      font-size: 0.88rem;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .category-badge {
      font-size: 0.74rem;
      padding: 4px 10px;
      border-radius: 12px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.06);
      color: var(--pc-text-secondary);
      display: inline-block;
      text-align: center;
      line-height: 1.3;
      word-break: break-word;
      max-width: 100%;
    }

    /* Stock Visual */
    .stock-visual {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }

    .stock-bar-container {
      flex: 1;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;
    }

    .stock-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .fill-ok { background: linear-gradient(90deg, #43A047, #66BB6A); }
    .fill-warning { background: linear-gradient(90deg, #FB8C00, #FFA726); }
    .fill-critical { background: linear-gradient(90deg, #E53935, #EF5350); }

    .stock-number { font-weight: 700; font-size: 0.88rem; min-width: 30px; }

    .stock-status-badge {
      font-size: 0.68rem;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .badge-ok { background: rgba(67, 160, 71, 0.12); color: #66BB6A; }
    .badge-warning { background: rgba(251, 140, 0, 0.12); color: #FFA726; }
    .badge-critical { background: rgba(229, 57, 53, 0.12); color: #EF5350; }

    .td-price { font-weight: 600; color: var(--pc-text-primary); }
    .td-updated { font-size: 0.78rem; color: var(--pc-text-muted); }

    /* Actions */
    .td-actions {
      display: flex;
      gap: 4px;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid var(--pc-border);
      background: rgba(255, 255, 255, 0.03);
      color: var(--pc-text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--pc-transition-fast);
    }

    .action-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .edit-btn:hover {
      background: rgba(59, 130, 246, 0.15);
      border-color: #3B82F6;
      color: #60A5FA;
    }

    .restock-btn:hover {
      background: rgba(16, 185, 129, 0.15);
      border-color: #10B981;
      color: #34D399;
    }

    .delete-btn:hover {
      background: rgba(229, 57, 53, 0.15);
      border-color: #E53935;
      color: #EF5350;
    }

    /* ---- Empty State ---- */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 20px;
      gap: 8px;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--pc-text-muted);
      opacity: 0.4;
    }

    .empty-state p {
      color: var(--pc-text-secondary);
      font-size: 1rem;
      font-weight: 600;
    }

    .empty-state span {
      color: var(--pc-text-muted);
      font-size: 0.85rem;
    }

    /* ---- Pagination ---- */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-top: 1px solid var(--pc-border);
    }

    .page-info {
      font-size: 0.8rem;
      color: var(--pc-text-muted);
    }

    .page-buttons {
      display: flex;
      gap: 4px;
    }

    .page-btn {
      min-width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid var(--pc-border);
      background: rgba(255, 255, 255, 0.03);
      color: var(--pc-text-secondary);
      font-size: 0.82rem;
      font-family: var(--pc-font-body);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--pc-transition-fast);
    }

    .page-btn:hover:not(:disabled) {
      background: rgba(242, 201, 76, 0.1);
      border-color: var(--pc-yellow);
      color: var(--pc-yellow);
    }

    .page-btn.active {
      background: var(--pc-yellow);
      border-color: var(--pc-yellow);
      color: #1A1A2E;
      font-weight: 700;
    }

    .page-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .page-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* ---- Modal ---- */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    .modal-content {
      background: var(--pc-bg-card);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      width: 520px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      animation: fadeInUp 0.3s ease;
    }

    .modal-delete { width: 440px; }
    .modal-restock { max-width: 500px; }
    .restock-product { font-size: 1.1rem; font-weight: 700; color: var(--pc-text-primary); }
    .restock-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; background: rgba(0,0,0,0.18); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-md); }
    .restock-summary span { display: flex; flex-direction: column; gap: 4px; color: var(--pc-text-muted); font-size: 0.78rem; }
    .restock-summary strong { color: var(--pc-text-primary); font-size: 1rem; }
    .restock-summary mat-icon { color: var(--pc-yellow); }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--pc-border);
    }

    .modal-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.15rem;
      font-family: var(--pc-font-heading);
    }

    .delete-header h2 mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .modal-close {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid var(--pc-border);
      background: transparent;
      color: var(--pc-text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--pc-transition-fast);
    }

    .modal-close:hover {
      background: rgba(229, 57, 53, 0.15);
      color: var(--pc-red);
    }

    .modal-body { padding: 24px; }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      font-size: 0.82rem;
      color: var(--pc-text-muted);
      font-weight: 600;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .form-input {
      width: 100%;
      padding: 10px 14px;
      background: var(--pc-bg-input);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-sm);
      color: var(--pc-text-primary);
      font-size: 0.9rem;
      font-family: var(--pc-font-body);
      outline: none;
      transition: border-color var(--pc-transition-fast);
      box-sizing: border-box;
    }

    .form-input:focus { border-color: var(--pc-yellow); }
    .form-input.input-error { border-color: #EF4444; background: rgba(239,68,68,0.06); }
    .req { color: #F87171; }
    .field-error { display: block; margin-top: 5px; font-size: 0.78rem; color: #F87171; }

    select.form-input {
      appearance: none;
      cursor: pointer;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .delete-msg {
      font-size: 0.95rem;
      color: var(--pc-text-secondary);
      margin-bottom: 8px;
    }

    .delete-warning {
      font-size: 0.82rem;
      color: var(--pc-red);
      opacity: 0.8;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--pc-border);
    }

    .btn-cancel {
      padding: 8px 20px;
      background: transparent;
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-sm);
      color: var(--pc-text-secondary);
      font-size: 0.88rem;
      font-family: var(--pc-font-body);
      cursor: pointer;
      transition: all var(--pc-transition-fast);
    }

    .btn-cancel:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .btn-save {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 20px;
      background: linear-gradient(135deg, var(--pc-yellow), var(--pc-yellow-dark));
      color: #1A1A2E;
      border: none;
      border-radius: var(--pc-radius-sm);
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      font-family: var(--pc-font-body);
      transition: all var(--pc-transition-fast);
    }

    .btn-save:hover:not(:disabled) {
      box-shadow: var(--pc-shadow-glow);
    }

    .btn-save:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-save mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .btn-delete {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 20px;
      background: linear-gradient(135deg, var(--pc-red), var(--pc-red-dark));
      color: white;
      border: none;
      border-radius: var(--pc-radius-sm);
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      font-family: var(--pc-font-body);
      transition: all var(--pc-transition-fast);
    }

    .btn-delete:hover { box-shadow: 0 0 20px rgba(229, 57, 53, 0.3); }
    .btn-delete mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* ---- Responsive ---- */
    @media (max-width: 1024px) {
      .stats-bar {
        grid-template-columns: repeat(2, 1fr);
      }

      .table-header-row, .table-row {
        grid-template-columns: 2fr 1fr 1.5fr 0.8fr 0.8fr;
      }

      .th-unit, .th-updated, .th-min,
      .td-unit, .td-updated, .td-min {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .stats-bar {
        grid-template-columns: repeat(2, 1fr);
      }

      .table-header-row, .table-row {
        grid-template-columns: 2fr 1.5fr 0.8fr;
      }

      .th-category, .th-unit, .th-updated, .th-min, .th-price,
      .td-category, .td-unit, .td-updated, .td-min, .td-price {
        display: none;
      }

      .form-row {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 480px) {
      .stats-bar {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class InventoryComponent {
  constructor(
    public auth: AuthService,
    public dataService: DataService
  ) {}

  // --- Filters ---
  currentDate = signal(new Date());
  searchQuery = signal('');
  selectedCategory = signal<string>('all');
  selectedLocation = signal<string>('all');
  selectedVendor = signal<string>('all');
  selectedStatus = signal<string>('all'); // Keeping this internal or accessible if needed
  currentPage = signal(1);
  readonly pageSize = 10;

  uniqueCategories = computed(() => {
    const cats = new Set(this.dataService.products().map(p => p.category));
    return Array.from(cats).sort();
  });

  stockStatuses = [
    { value: 'all', label: 'Todos' },
    { value: 'ok', label: '✅ OK' },
    { value: 'low', label: '⚠️ Bajo' },
    { value: 'critical', label: '🔴 Crítico' },
  ];

  // --- Computed stats ---
  totalProducts = computed(() => this.dataService.products().length);
  stockOkCount = computed(() => this.dataService.products().filter(p => p.currentStock > p.minStock).length);
  lowStockCount = computed(() => this.dataService.products().filter(p => p.currentStock <= p.minStock).length);
  totalValue = computed(() => this.dataService.products().reduce((sum, p) => sum + p.currentStock * p.currentPrice, 0));

  // --- Filtered products ---
  filteredProducts = computed(() => {
    let products = this.dataService.products();
    const query = this.searchQuery().toLowerCase();
    const cat = this.selectedCategory();
    const vendor = this.selectedVendor();
    const status = this.selectedStatus();

    if (query) {
      products = products.filter(p => p.name.toLowerCase().includes(query));
    }
    if (cat !== 'all') {
      products = products.filter(p => p.category === cat);
    }
    if (vendor !== 'all') {
      products = products.filter(p => p.supplierId === vendor);
    }
    if (status === 'ok') {
      products = products.filter(p => p.currentStock > p.minStock);
    } else if (status === 'low') {
      products = products.filter(p => p.currentStock <= p.minStock && p.currentStock > p.minStock * 0.5);
    } else if (status === 'critical') {
      products = products.filter(p => p.currentStock <= p.minStock * 0.5);
    }

    return products;
  });

  // Reset page when filters change
  _ = effect(() => {
    this.searchQuery();
    this.selectedCategory();
    this.selectedVendor();
    this.selectedLocation();
    this.selectedStatus();
    this.currentPage.set(1);
  });

  // --- Pagination ---
  totalPages = computed(() => Math.ceil(this.filteredProducts().length / this.pageSize));
  paginationStart = computed(() => (this.currentPage() - 1) * this.pageSize);
  paginationEnd = computed(() => Math.min(this.paginationStart() + this.pageSize, this.filteredProducts().length));
  paginatedProducts = computed(() => this.filteredProducts().slice(this.paginationStart(), this.paginationEnd()));
  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  // --- Modal state ---
  showModal = signal(false);
  editingProduct = signal<Product | null>(null);
  showRestockModal = signal(false);
  restockingProduct = signal<Product | null>(null);
  restockQuantity = 0;
  showDeleteModal = signal(false);
  deletingProduct = signal<Product | null>(null);

  // --- Form ---
  formName = '';
  formCategory: string = 'Otro';
  formUnit: ProductUnit = 'kg';
  formStock = 0;
  formMinStock = 0;
  formPrice = 0;
  formSupplierId = '';
  formSubmitted = false;

  openAddModal(): void {
    this.editingProduct.set(null);
    this.formName = '';
    this.formCategory = 'Otro';
    this.formUnit = 'kg';
    this.formStock = 0;
    this.formMinStock = 0;
    this.formPrice = 0;
    this.formSupplierId = '';
    this.formSubmitted = false;
    this.showModal.set(true);
  }

  openEditModal(product: Product): void {
    this.editingProduct.set(product);
    this.formSubmitted = false;
    this.formName = product.name;
    this.formCategory = product.category;
    this.formUnit = product.unit;
    this.formStock = product.currentStock;
    this.formMinStock = product.minStock;
    this.formPrice = product.currentPrice;
    this.formSupplierId = product.supplierId || '';
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingProduct.set(null);
  }

  openRestockModal(product: Product): void {
    this.restockingProduct.set(product);
    this.restockQuantity = 0;
    this.showRestockModal.set(true);
  }

  closeRestockModal(): void {
    this.showRestockModal.set(false);
    this.restockingProduct.set(null);
    this.restockQuantity = 0;
  }

  restockResult(): number {
    return (this.restockingProduct()?.currentStock ?? 0) + Math.max(0, Number(this.restockQuantity) || 0);
  }

  confirmRestock(): void {
    const product = this.restockingProduct();
    const quantity = Number(this.restockQuantity);
    if (!product || quantity <= 0) return;
    this.dataService.restockProduct(product.id, quantity);
    this.closeRestockModal();
  }

  isFormValid(): boolean {
    return this.formName.trim().length > 0 && this.formStock >= 0 && this.formMinStock >= 0 && this.formPrice >= 0;
  }

  saveProduct(): void {
    this.formSubmitted = true;
    if (!this.isFormValid()) return;
    
    const supplier = this.dataService.suppliers().find(s => s.id === this.formSupplierId);

    const existing = this.editingProduct();
    if (existing) {
      this.dataService.updateProduct(existing.id, {
        name: this.formName.trim(),
        category: this.formCategory,
        unit: this.formUnit,
        currentStock: this.formStock,
        minStock: this.formMinStock,
        currentPrice: this.formPrice,
        supplierId: supplier?.id || undefined,
        supplierName: supplier?.name || undefined,
      });
    } else {
      this.dataService.addProduct({
        name: this.formName.trim(),
        category: this.formCategory,
        unit: this.formUnit,
        currentStock: this.formStock,
        minStock: this.formMinStock,
        currentPrice: this.formPrice,
        createdBy: this.auth.userName(),
        supplierId: supplier?.id,
        supplierName: supplier?.name,
      });
    }

    this.closeModal();
  }

  openDeleteModal(product: Product): void {
    this.deletingProduct.set(product);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deletingProduct.set(null);
  }

  confirmDelete(): void {
    const product = this.deletingProduct();
    if (product) {
      this.dataService.deleteProduct(product.id);
    }
    this.closeDeleteModal();
  }

  // --- Helpers ---
  getStockPercent(product: Product): number {
    if (product.minStock === 0) return 100;
    return Math.min(100, (product.currentStock / (product.minStock * 2)) * 100);
  }

  getStockStatusText(product: Product): string {
    if (product.currentStock <= product.minStock * 0.5) return 'Crítico';
    if (product.currentStock <= product.minStock) return 'Bajo';
    return 'OK';
  }

  getCategoryColor(category: string): { bg: string, color: string } {
    const colorMap: Record<string, {bg: string, color: string}> = {
      'Aceites y Grasas': { bg: 'rgba(245, 159, 0, 0.12)', color: '#FCC419' },
      'Bebidas': { bg: 'rgba(59, 130, 246, 0.12)', color: '#60A5FA' },
      'Carnes y Embutidos': { bg: 'rgba(239, 68, 68, 0.12)', color: '#F87171' },
      'Condimentos y Salsas': { bg: 'rgba(217, 70, 239, 0.12)', color: '#E879F9' },
      'Congelados y Picaderas': { bg: 'rgba(6, 182, 212, 0.12)', color: '#22D3EE' },
      'Desechables y Empaques': { bg: 'rgba(139, 92, 246, 0.12)', color: '#A78BFA' },
      'Granos, Secos y Enlatados': { bg: 'rgba(217, 119, 6, 0.12)', color: '#FBBF24' },
      'Hielo': { bg: 'rgba(14, 165, 233, 0.12)', color: '#38BDF8' },
      'Lácteos': { bg: 'rgba(248, 113, 113, 0.12)', color: '#FCA5A5' },
      'Limpieza y Químicos': { bg: 'rgba(16, 185, 129, 0.12)', color: '#34D399' },
      'Pollo y Aves': { bg: 'rgba(242, 201, 76, 0.12)', color: 'var(--pc-yellow)' },
      'Suministros de Operación': { bg: 'rgba(107, 114, 128, 0.12)', color: '#9CA3AF' },
      'Utensilios y Equipos': { bg: 'rgba(156, 163, 175, 0.12)', color: '#D1D5DB' },
      'Vegetales y Víveres': { bg: 'rgba(132, 204, 22, 0.12)', color: '#A3E635' },
    };
    
    if (colorMap[category]) return colorMap[category];
    
    // Hash based color for unknown categories
    const hash = category.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const h = Math.abs(hash) % 360;
    return {
      bg: 'hsla(' + h + ', 70%, 50%, 0.12)',
      color: 'hsl(' + h + ', 80%, 65%)'
    };
  }

  getUnitLabel(unit: string): string {
    return UNIT_LABELS[unit as ProductUnit] || unit;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('es', { month: 'short', day: 'numeric' });
  }
}
