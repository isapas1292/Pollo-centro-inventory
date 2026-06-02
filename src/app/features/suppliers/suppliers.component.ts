import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { Supplier } from '../../core/models';
import { LucideTruck, LucidePlus, LucideSearch, LucideEdit2, LucideTrash2, LucideX, LucideCheck, LucideMail, LucidePhone } from '@lucide/angular';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideTruck, LucidePlus, LucideSearch, LucideEdit2, LucideTrash2, LucideX, LucideCheck, LucideMail, LucidePhone],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg lucideTruck class="w-8 h-8 text-primary-500"></svg>
            Gestión de Proveedores
          </h1>
          <p class="text-gray-500 dark:text-gray-400">Administra la lista de proveedores autorizados.</p>
        </div>
        
        <button 
          (click)="openForm()"
          class="btn-primary flex items-center gap-2">
          <svg lucidePlus class="w-5 h-5"></svg>
          Nuevo Proveedor
        </button>
      </div>

      <!-- Filters & Search -->
      <div class="card p-4 flex flex-col sm:flex-row gap-4">
        <div class="relative flex-1">
          <svg lucideSearch class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"></svg>
          <input 
            type="text" 
            [(ngModel)]="searchTerm"
            placeholder="Buscar por nombre, contacto o correo..." 
            class="input-field pl-10"
          >
        </div>
      </div>

      <!-- Suppliers Grid/Table -->
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <th class="p-4 font-semibold text-gray-600 dark:text-gray-300">Empresa</th>
                <th class="p-4 font-semibold text-gray-600 dark:text-gray-300">Contacto</th>
                <th class="p-4 font-semibold text-gray-600 dark:text-gray-300">Información</th>
                <th class="p-4 font-semibold text-gray-600 dark:text-gray-300">Estado</th>
                <th class="p-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (supplier of filteredSuppliers(); track supplier.id) {
                <tr class="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                  <td class="p-4">
                    <div class="font-medium text-gray-900 dark:text-white">{{ supplier.name }}</div>
                  </td>
                  <td class="p-4">
                    <div class="text-gray-600 dark:text-gray-400">{{ supplier.contactName || 'No especificado' }}</div>
                  </td>
                  <td class="p-4 space-y-1">
                    @if (supplier.phone) {
                      <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <svg lucidePhone class="w-4 h-4"></svg>
                        {{ supplier.phone }}
                      </div>
                    }
                    @if (supplier.email) {
                      <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <svg lucideMail class="w-4 h-4"></svg>
                        {{ supplier.email }}
                      </div>
                    }
                  </td>
                  <td class="p-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          [class.bg-green-100]="supplier.active"
                          [class.text-green-800]="supplier.active"
                          [class.dark:bg-green-900/30]="supplier.active"
                          [class.dark:text-green-400]="supplier.active"
                          [class.bg-red-100]="!supplier.active"
                          [class.text-red-800]="!supplier.active"
                          [class.dark:bg-red-900/30]="!supplier.active"
                          [class.dark:text-red-400]="!supplier.active">
                      {{ supplier.active ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="p-4 text-right space-x-2">
                    <button 
                      (click)="openForm(supplier)"
                      class="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      title="Editar">
                      <svg lucideEdit2 class="w-5 h-5"></svg>
                    </button>
                    <button 
                      (click)="deleteSupplier(supplier)"
                      class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Eliminar">
                      <svg lucideTrash2 class="w-5 h-5"></svg>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="p-8 text-center text-gray-500 dark:text-gray-400">
                    <div class="flex flex-col items-center justify-center space-y-3">
                      <svg lucideTruck class="w-12 h-12 text-gray-300 dark:text-gray-600"></svg>
                      <p class="text-lg font-medium">No se encontraron proveedores</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Supplier Form Modal -->
    @if (showForm()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">
              {{ editingSupplier() ? 'Editar Proveedor' : 'Nuevo Proveedor' }}
            </h3>
            <button (click)="closeForm()" class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
              <svg lucideX class="w-6 h-6"></svg>
            </button>
          </div>

          <form (ngSubmit)="saveSupplier()" class="p-6 space-y-4">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la Empresa *</label>
                <input type="text" [(ngModel)]="formData.name" name="name" required class="input-field" placeholder="Ej. Distribuidora S.A.">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Contacto</label>
                <input type="text" [(ngModel)]="formData.contactName" name="contactName" class="input-field" placeholder="Ej. Juan Pérez">
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                  <input type="text" [(ngModel)]="formData.phone" name="phone" class="input-field" placeholder="Ej. 555-0123">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico</label>
                  <input type="email" [(ngModel)]="formData.email" name="email" class="input-field" placeholder="ejemplo@empresa.com">
                </div>
              </div>

              <div class="flex items-center gap-2">
                <input type="checkbox" [(ngModel)]="formData.active" name="active" id="active" class="rounded border-gray-300 text-primary-600 focus:ring-primary-500">
                <label for="active" class="text-sm font-medium text-gray-700 dark:text-gray-300">Proveedor Activo</label>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
                <textarea [(ngModel)]="formData.notes" name="notes" rows="3" class="input-field" placeholder="Condiciones de pago, días de entrega..."></textarea>
              </div>
            </div>

            <div class="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <button type="button" (click)="closeForm()" class="btn-secondary">
                Cancelar
              </button>
              <button type="submit" class="btn-primary flex items-center gap-2" [disabled]="!formData.name">
                <svg lucideCheck class="w-5 h-5"></svg>
                Guardar Proveedor
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class SuppliersComponent {
  // Icons








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
