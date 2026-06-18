import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../../core/services/data.service';
import { AppUser, UserRole } from '../../core/models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">people</mat-icon> Gestión de Usuarios</h1>
          <p>Administra los accesos y roles del sistema Pollo Centro</p>
        </div>
        <button class="btn-primary" (click)="openModal()">
          <mat-icon>person_add</mat-icon> Nuevo Usuario
        </button>
      </div>

      <!-- Users Grid -->
      <div class="users-grid stagger-children">
        @for (user of users(); track user.uid) {
          <div class="user-card animate-fade-in-up" [class.inactive]="!user.active">
            <div class="user-header">
              <div class="user-avatar" [class.bg-master]="user.role === 'master'" [class.bg-manager]="user.role === 'manager'" [class.bg-ops]="user.role === 'operations'">
                {{ user.displayName.charAt(0).toUpperCase() }}
              </div>
              <div class="user-actions">
                <button class="icon-btn edit-btn" (click)="openModal(user)"><mat-icon>edit</mat-icon></button>
                <button class="icon-btn delete-btn" (click)="deleteUser(user.uid)"><mat-icon>delete</mat-icon></button>
              </div>
            </div>
            
            <div class="user-body">
              <h3 class="user-name">{{ user.displayName }}</h3>
              <p class="user-email">{{ user.email }}</p>
              
              <div class="user-badges">
                <span class="role-badge" [class.bg-master]="user.role === 'master'" [class.bg-manager]="user.role === 'manager'" [class.bg-ops]="user.role === 'operations'">
                  <mat-icon>shield</mat-icon> {{ getRoleLabel(user.role) }}
                </span>
                <span class="status-badge" [class.status-active]="user.active" [class.status-inactive]="!user.active">
                  {{ user.active ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
            </div>
            
            <div class="user-footer">
              <div class="meta-item" *ngIf="user.phone">
                <mat-icon>phone</mat-icon> {{ user.phone }}
              </div>
              <div class="meta-item">
                <mat-icon>calendar_today</mat-icon> Creado: {{ user.createdAt | date:'shortDate' }}
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingUser() ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
              <button mat-icon-button (click)="closeModal()"><mat-icon>close</mat-icon></button>
            </div>
            
            <div class="modal-body">
              <div class="form-group">
                <label>Nombre Completo</label>
                <input type="text" [(ngModel)]="form.displayName" class="pc-input" placeholder="Ej. Juan Pérez">
              </div>
              
              <div class="form-group">
                <label>Correo Electrónico (Login)</label>
                <input type="email" [(ngModel)]="form.email" class="pc-input" placeholder="ejemplo@pollocentro.com">
              </div>

              @if (!editingUser()) {
                <div class="form-group">
                  <label>Contraseña</label>
                  <input type="password" [(ngModel)]="form.password" class="pc-input" placeholder="Min. 6 caracteres">
                </div>
              }
              
              <div class="form-row">
                <div class="form-group">
                  <label>Rol del Sistema</label>
                  <select [(ngModel)]="form.role" class="pc-select">
                    <option value="operations">Operaciones (Limitado)</option>
                    <option value="manager">Manager (Gestión)</option>
                    <option value="master">Master (Todo el acceso)</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label>Teléfono</label>
                  <input type="text" [(ngModel)]="form.phone" class="pc-input" placeholder="Opcional">
                </div>
              </div>

              <div class="form-group checkbox-group">
                <label class="checkbox-container">
                  <input type="checkbox" [(ngModel)]="form.active">
                  <span class="checkmark"></span>
                  Usuario Activo (Permitir acceso)
                </label>
              </div>
            </div>
            
            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeModal()">Cancelar</button>
              <button class="btn-primary" (click)="saveUser()">Guardar Usuario</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; padding-bottom: 40px; }
    
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 32px; flex-wrap: wrap; gap: 16px;
    }
    
    .header-text h1 { font-family: var(--pc-font-heading); font-size: 1.8rem; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: var(--pc-yellow); }
    .header-text p { color: var(--pc-text-muted); font-size: 0.9rem; }

    /* Buttons */
    .btn-primary { background: var(--pc-yellow); color: #1A1A2E; border: none; padding: 10px 20px; border-radius: var(--pc-radius-md); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(242, 201, 76, 0.2); }
    .btn-secondary { background: rgba(255, 255, 255, 0.05); color: var(--pc-text-primary); border: 1px solid var(--pc-border); padding: 10px 20px; border-radius: var(--pc-radius-md); font-weight: 500; cursor: pointer; }
    
    /* Grid */
    .users-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    
    /* User Card */
    .user-card {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg);
      padding: 24px; transition: all 0.2s; display: flex; flex-direction: column;
    }
    .user-card:hover { border-color: var(--pc-border-active); transform: translateY(-2px); box-shadow: var(--pc-shadow-glow); }
    .user-card.inactive { opacity: 0.6; filter: grayscale(0.5); }
    
    .user-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    
    .user-avatar {
      width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; font-weight: 700; color: white;
    }
    .bg-master { background: linear-gradient(135deg, #EF4444, #B91C1C); }
    .bg-manager { background: linear-gradient(135deg, #3B82F6, #1D4ED8); }
    .bg-ops { background: linear-gradient(135deg, #10B981, #047857); }

    .user-actions { display: flex; gap: 4px; }
    .icon-btn { background: transparent; border: none; color: var(--pc-text-muted); cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s; }
    .icon-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .edit-btn:hover { color: var(--pc-yellow); background: rgba(242, 201, 76, 0.1); }
    .delete-btn:hover { color: #EF4444; background: rgba(239, 68, 68, 0.1); }

    .user-body { flex: 1; margin-bottom: 20px; }
    .user-name { font-size: 1.2rem; font-weight: 600; margin-bottom: 4px; }
    .user-email { font-size: 0.85rem; color: var(--pc-text-muted); margin-bottom: 16px; word-break: break-all; }
    
    .user-badges { display: flex; gap: 8px; flex-wrap: wrap; }
    .role-badge { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; color: white; }
    .role-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    
    .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
    .status-active { background: rgba(16, 185, 129, 0.1); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.2); }
    .status-inactive { background: rgba(239, 68, 68, 0.1); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.2); }

    .user-footer { border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px; display: flex; flex-direction: column; gap: 8px; }
    .meta-item { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--pc-text-secondary); }
    .meta-item mat-icon { font-size: 16px; width: 16px; height: 16px; opacity: 0.7; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .modal-content { background: var(--pc-bg-sidebar); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg); width: 100%; max-width: 500px; box-shadow: var(--pc-shadow-xl); animation: modalSlideIn 0.3s ease; }
    @keyframes modalSlideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    
    .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--pc-border); display: flex; justify-content: space-between; align-items: center; }
    .modal-header h2 { font-family: var(--pc-font-heading); font-size: 1.2rem; }
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    
    .form-group label { display: block; margin-bottom: 8px; font-size: 0.85rem; color: var(--pc-text-secondary); }
    .form-row { display: flex; gap: 16px; }
    .form-row .form-group { flex: 1; }
    
    .pc-input, .pc-select { width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-md); padding: 10px 14px; color: var(--pc-text-primary); font-family: var(--pc-font-body); transition: all 0.2s; }
    .pc-input:focus, .pc-select:focus { outline: none; border-color: var(--pc-yellow); background: rgba(0,0,0,0.4); }
    .pc-select option { background: var(--pc-bg-sidebar); }

    .modal-footer { padding: 16px 24px; border-top: 1px solid var(--pc-border); display: flex; justify-content: flex-end; gap: 12px; }

    /* Checkbox */
    .checkbox-group { margin-top: 8px; }
    .checkbox-container { display: flex; align-items: center; cursor: pointer; font-size: 0.9rem; user-select: none; color: var(--pc-text-primary); }
    .checkbox-container input { position: absolute; opacity: 0; cursor: pointer; height: 0; width: 0; }
    .checkmark { height: 20px; width: 20px; background-color: rgba(0,0,0,0.2); border: 1px solid var(--pc-border); border-radius: 4px; margin-right: 12px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .checkbox-container:hover input ~ .checkmark { border-color: var(--pc-yellow); }
    .checkbox-container input:checked ~ .checkmark { background-color: var(--pc-yellow); border-color: var(--pc-yellow); }
    .checkmark:after { content: ""; display: none; width: 5px; height: 10px; border: solid #1A1A2E; border-width: 0 2px 2px 0; transform: rotate(45deg); margin-bottom: 2px; }
    .checkbox-container input:checked ~ .checkmark:after { display: block; }

    @media (max-width: 600px) {
      .form-row { flex-direction: column; gap: 16px; }
    }
  `]
})
export class UsersComponent {
  users = computed(() => this.dataService.users());
  
  showModal = signal(false);
  editingUser = signal<AppUser | null>(null);
  
  form = {
    displayName: '',
    email: '',
    password: '',
    role: 'operations' as UserRole,
    phone: '',
    active: true
  };

  constructor(private dataService: DataService) {}

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      master: 'Master',
      manager: 'Manager',
      operations: 'Operaciones',
    };
    return labels[role] || role;
  }

  openModal(user?: AppUser) {
    if (user) {
      this.editingUser.set(user);
      this.form = {
        displayName: user.displayName,
        email: user.email,
        password: '',
        role: user.role,
        phone: user.phone || '',
        active: user.active
      };
    } else {
      this.editingUser.set(null);
      this.form = {
        displayName: '',
        email: '',
        password: '',
        role: 'operations',
        phone: '',
        active: true
      };
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveUser() {
    if (!this.form.displayName || !this.form.email) return;

    if (this.editingUser()) {
      this.dataService.updateUser(this.editingUser()!.uid, {
        displayName: this.form.displayName,
        email: this.form.email,
        role: this.form.role,
        phone: this.form.phone,
        active: this.form.active
      });
    } else {
      if (!this.form.password) return; // Password required for new
      this.dataService.addUser({
        displayName: this.form.displayName,
        email: this.form.email,
        role: this.form.role,
        phone: this.form.phone,
        active: this.form.active
      }, this.form.password);
    }
    
    this.closeModal();
  }

  deleteUser(uid: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      this.dataService.deleteUser(uid);
    }
  }
}
