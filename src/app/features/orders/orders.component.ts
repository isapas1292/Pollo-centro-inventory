import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { OrderReception, Supplier, Product } from '../../core/models';
import { LucideShoppingCart, LucidePlus, LucideSearch, LucideMail, LucideCheckCircle, LucideClock, LucidePackage } from '@lucide/angular';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideShoppingCart, LucidePlus, LucideSearch, LucideMail, LucideCheckCircle, LucideClock, LucidePackage],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg lucideShoppingCart class="w-8 h-8 text-primary-500"></svg>
            Pedidos y Recepciones
          </h1>
          <p class="text-gray-500 dark:text-gray-400">Gestiona pedidos a proveedores y registra la llegada de mercancía.</p>
        </div>
        
        <button 
          (click)="openForm()"
          class="btn-primary flex items-center gap-2">
          <svg lucidePlus class="w-5 h-5"></svg>
          Hacer Pedido
        </button>
      </div>

      <!-- Filters & Search -->
      <div class="card p-4 flex flex-col sm:flex-row gap-4">
        <div class="relative flex-1">
          <svg lucideSearch class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"></svg>
          <input 
            type="text" 
            [(ngModel)]="searchTerm"
            placeholder="Buscar por producto, proveedor o estado..." 
            class="input-field pl-10"
          >
        </div>
        <select [(ngModel)]="statusFilter" class="input-field w-full sm:w-48">
          <option value="all">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="completed">Completados (Recibidos)</option>
        </select>
      </div>

      <!-- Orders Grid/Table -->
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <th class="p-4 font-semibold text-gray-600 dark:text-gray-300">Fecha</th>
                <th class="p-4 font-semibold text-gray-600 dark:text-gray-300">Producto</th>
                <th class="p-4 font-semibold text-gray-600 dark:text-gray-300">Proveedor</th>
                <th class="p-4 font-semibold text-gray-600 dark:text-gray-300">Cantidad</th>
                <th class="p-4 font-semibold text-gray-600 dark:text-gray-300">Total</th>
                <th class="p-4 font-semibold text-gray-600 dark:text-gray-300">Estado</th>
                <th class="p-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (order of filteredOrders(); track order.id) {
                <tr class="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                  <td class="p-4">
                    <div class="text-gray-900 dark:text-white font-medium">
                      {{ order.receivedAt | date:'shortDate' }}
                    </div>
                  </td>
                  <td class="p-4">
                    <div class="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <svg lucidePackage class="w-4 h-4 text-gray-400"></svg>
                      {{ order.productName }}
                    </div>
                  </td>
                  <td class="p-4 text-gray-600 dark:text-gray-400">
                    {{ order.supplierName }}
                  </td>
                  <td class="p-4 text-gray-900 dark:text-white font-medium">
                    {{ order.quantity }}
                  </td>
                  <td class="p-4 font-semibold text-primary-600">
                    {{ order.total | currency }}
                  </td>
                  <td class="p-4">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          [class.bg-yellow-100]="order.status === 'pending'"
                          [class.text-yellow-800]="order.status === 'pending'"
                          [class.dark:bg-yellow-900/30]="order.status === 'pending'"
                          [class.dark:text-yellow-400]="order.status === 'pending'"
                          [class.bg-green-100]="order.status === 'completed'"
                          [class.text-green-800]="order.status === 'completed'"
                          [class.dark:bg-green-900/30]="order.status === 'completed'"
                          [class.dark:text-green-400]="order.status === 'completed'">
                      @if (order.status === 'pending') {
                        <svg lucideClock class="w-3.5 h-3.5"></svg>
                      } @else {
                        <svg lucideCheckCircle class="w-3.5 h-3.5"></svg>
                      }
                      {{ order.status === 'pending' ? 'Pendiente' : 'Recibido' }}
                    </span>
                  </td>
                  <td class="p-4 text-right space-x-2 flex justify-end">
                    @if (order.status === 'pending') {
                      <button 
                        (click)="sendEmail(order)"
                        class="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-1"
                        title="Enviar Correo al Proveedor">
                        <svg lucideMail class="w-4 h-4"></svg>
                        <span class="text-xs font-medium">Correo</span>
                      </button>
                      <button 
                        (click)="markAsReceived(order)"
                        class="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors flex items-center gap-1"
                        title="Marcar como Recibido">
                        <svg lucideCheckCircle class="w-4 h-4"></svg>
                        <span class="text-xs font-medium">Recibir</span>
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="p-8 text-center text-gray-500 dark:text-gray-400">
                    <div class="flex flex-col items-center justify-center space-y-3">
                      <svg lucideShoppingCart class="w-12 h-12 text-gray-300 dark:text-gray-600"></svg>
                      <p class="text-lg font-medium">No hay pedidos registrados</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Order Form Modal -->
    @if (showForm()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">Nuevo Pedido</h3>
          </div>

          <form (ngSubmit)="saveOrder()" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proveedor *</label>
              <select [(ngModel)]="formData.supplierId" name="supplierId" (change)="onSupplierChange()" required class="input-field">
                <option value="">Seleccione un proveedor</option>
                @for (sup of dataService.suppliers(); track sup.id) {
                  <option [value]="sup.id">{{ sup.name }}</option>
                }
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Producto *</label>
              <select [(ngModel)]="formData.productId" name="productId" (change)="onProductChange()" required class="input-field">
                <option value="">Seleccione un producto</option>
                @for (prod of availableProducts(); track prod.id) {
                  <option [value]="prod.id">{{ prod.name }} ({{ prod.category }})</option>
                }
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad *</label>
                <input type="number" [(ngModel)]="formData.quantity" name="quantity" required min="1" class="input-field" (input)="calculateTotal()">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Unitario *</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input type="number" [(ngModel)]="formData.price" name="price" required min="0" step="0.01" class="input-field pl-8" (input)="calculateTotal()">
                </div>
              </div>
            </div>

            <div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl flex justify-between items-center border border-gray-100 dark:border-gray-700">
              <span class="font-medium text-gray-700 dark:text-gray-300">Total Estimado</span>
              <span class="text-xl font-bold text-primary-600">{{ formData.total || 0 | currency }}</span>
            </div>

            <div class="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <button type="button" (click)="closeForm()" class="btn-secondary">
                Cancelar
              </button>
              <button type="submit" class="btn-primary" [disabled]="!isFormValid()">
                Crear Pedido
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class OrdersComponent {







  dataService = inject(DataService);

  searchTerm = signal('');
  statusFilter = signal('all');
  showForm = signal(false);

  formData: Partial<OrderReception> = this.getInitialFormData();

  filteredOrders = computed(() => {
    let list = this.dataService.orderReceptions();
    const term = this.searchTerm().toLowerCase();
    const status = this.statusFilter();

    if (status !== 'all') {
      list = list.filter(o => o.status === status);
    }

    if (term) {
      list = list.filter(o => 
        o.productName.toLowerCase().includes(term) ||
        o.supplierName.toLowerCase().includes(term)
      );
    }

    // Sort by date descending
    return list.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  });

  availableProducts = computed(() => {
    // Si queremos filtrar por el proveedor seleccionado, podemos hacerlo aquí.
    // Pero es mejor mostrar todos y tal vez sugerir.
    return this.dataService.products();
  });

  private getInitialFormData(): Partial<OrderReception> {
    return {
      supplierId: '',
      productId: '',
      quantity: 1,
      price: 0,
      total: 0,
      status: 'pending'
    };
  }

  openForm() {
    this.formData = this.getInitialFormData();
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
  }

  onSupplierChange() {
    // Optional: filter products or prepopulate based on supplier history
  }

  onProductChange() {
    const product = this.dataService.products().find(p => p.id === this.formData.productId);
    if (product) {
      this.formData.price = product.currentPrice;
      this.calculateTotal();
    }
  }

  calculateTotal() {
    if (this.formData.quantity && this.formData.price) {
      this.formData.total = this.formData.quantity * this.formData.price;
    } else {
      this.formData.total = 0;
    }
  }

  isFormValid(): boolean {
    return !!(this.formData.supplierId && this.formData.productId && this.formData.quantity && this.formData.price);
  }

  saveOrder() {
    if (!this.isFormValid()) return;

    const supplier = this.dataService.suppliers().find(s => s.id === this.formData.supplierId);
    const product = this.dataService.products().find(p => p.id === this.formData.productId);

    if (!supplier || !product) return;

    const orderToSave: Omit<OrderReception, 'id' | 'receivedAt'> = {
      supplierId: supplier.id,
      supplierName: supplier.name,
      productId: product.id,
      productName: product.name,
      quantity: this.formData.quantity || 1,
      price: this.formData.price || 0,
      total: this.formData.total || 0,
      status: 'pending',
      receivedBy: 'System' // En una app real vendría de authService
    };

    const createdOrder = this.dataService.addOrderReception(orderToSave);
    this.closeForm();
    
    // Preguntar si quiere enviar correo inmediatamente
    if (confirm('Pedido creado exitosamente. ¿Deseas enviar el correo al proveedor ahora?')) {
      this.sendEmail(createdOrder);
    }
  }

  markAsReceived(order: OrderReception) {
    if (confirm(`¿Marcar la llegada de ${order.quantity}x ${order.productName}? Esto actualizará el inventario.`)) {
      this.dataService.updateOrderReception(order.id, { status: 'completed' });
      // En el DataService podríamos agregar lógica para actualizar el inventario cuando pasa a completed,
      // O lo hacemos directamente aquí:
      const product = this.dataService.products().find(p => p.id === order.productId);
      if (product) {
        this.dataService.updateProduct(product.id, {
          currentStock: product.currentStock + order.quantity
        });
      }
    }
  }

  sendEmail(order: OrderReception) {
    const supplier = this.dataService.suppliers().find(s => s.id === order.supplierId);
    if (!supplier || !supplier.email) {
      alert('El proveedor no tiene un correo electrónico configurado.');
      return;
    }

    const subject = encodeURIComponent(`Nuevo Pedido de ${order.productName} - Pollo Centro`);
    const body = encodeURIComponent(
      `Hola ${supplier.contactName || supplier.name},\n\n` +
      `Por medio de la presente solicito el siguiente pedido:\n\n` +
      `- Producto: ${order.productName}\n` +
      `- Cantidad: ${order.quantity}\n` +
      `- Precio Acordado: $${order.price}\n` +
      `- Total Estimado: $${order.total}\n\n` +
      `Por favor confirmar la recepción de este pedido y el tiempo estimado de entrega.\n\n` +
      `Saludos cordiales,\nEquipo Pollo Centro`
    );

    window.location.href = `mailto:${supplier.email}?subject=${subject}&body=${body}`;
  }
}
