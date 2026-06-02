import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { ScheduleShift, Employee } from '../../core/models';

interface DayColumn {
  index: number;
  name: string;
  shortName: string;
  date: Date;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule
  ],
  template: `
    <div class="schedule-page animate-fade-in-up">
      <!-- Header & Navigator -->
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">calendar_month</mat-icon> Horarios Semanales</h1>
          <p>Gestiona los turnos del personal en todas las sucursales</p>
        </div>

        <div class="week-navigator">
          <button mat-icon-button (click)="changeWeek(-1)" matTooltip="Semana Anterior">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <div class="current-week">
            <mat-icon>date_range</mat-icon>
            <span>Semana {{ currentWeekNumber() }}</span>
            <small>{{ weekDateRange() }}</small>
          </div>
          <button mat-icon-button (click)="changeWeek(1)" matTooltip="Semana Siguiente">
            <mat-icon>chevron_right</mat-icon>
          </button>
          <button class="btn-today" (click)="goToCurrentWeek()" *ngIf="!isCurrentWeek()">
            Volver a esta semana
          </button>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="stats-bar stagger-children">
        <div class="stat-card animate-fade-in-up">
          <div class="stat-icon s-blue"><mat-icon>people</mat-icon></div>
          <div class="stat-info">
            <span class="stat-val">{{ activeEmployees().length }}</span>
            <span class="stat-lbl">Empleados Activos</span>
          </div>
        </div>
        <div class="stat-card animate-fade-in-up">
          <div class="stat-icon s-green"><mat-icon>event_available</mat-icon></div>
          <div class="stat-info">
            <span class="stat-val">{{ currentWeekShifts().length }}</span>
            <span class="stat-lbl">Turnos esta semana</span>
          </div>
        </div>
        <div class="stat-card animate-fade-in-up">
          <div class="stat-icon s-purple"><mat-icon>storefront</mat-icon></div>
          <div class="stat-info">
            <span class="stat-val">{{ activeLocationsCount() }}</span>
            <span class="stat-lbl">Locales Activos</span>
          </div>
        </div>
        <div class="stat-card animate-fade-in-up">
          <div class="stat-icon s-orange"><mat-icon>schedule</mat-icon></div>
          <div class="stat-info">
            <span class="stat-val">{{ totalHours() }}</span>
            <span class="stat-lbl">Horas Programadas</span>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="filters">
          <button class="view-toggle" [class.active]="viewMode() === 'employee'" (click)="viewMode.set('employee')">
            <mat-icon>person</mat-icon> Por Empleado
          </button>
          <button class="view-toggle" [class.active]="viewMode() === 'location'" (click)="viewMode.set('location')">
            <mat-icon>store</mat-icon> Por Local
          </button>
          
          <div class="location-legend">
            @for (loc of dataService.locations; track loc.id) {
              <div class="legend-item">
                <div class="legend-color" [style.background]="getLocationColor(loc.id)"></div>
                <span>{{ loc.name.replace('Pollo Centro - ', '') }}</span>
              </div>
            }
          </div>
        </div>
        
        <div class="actions">
          <button class="btn-secondary" (click)="openEmployeeModal()">
            <mat-icon>person_add</mat-icon> Nuevo Empleado
          </button>
          <button class="btn-primary" (click)="openShiftModal()">
            <mat-icon>add</mat-icon> Asignar Turno
          </button>
        </div>
      </div>

      <!-- Schedule Grid (By Employee) -->
      @if (viewMode() === 'employee') {
        <div class="schedule-grid-container">
          <table class="schedule-table">
            <thead>
              <tr>
                <th class="th-employee">Empleado</th>
                @for (day of weekDays(); track day.index) {
                  <th class="th-day" [class.today]="isToday(day.date)">
                    <div class="day-name">{{ day.name }}</div>
                    <div class="day-date">{{ day.date | date:'d MMM' }}</div>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (emp of activeEmployees(); track emp.id) {
                <tr>
                  <td class="td-employee">
                    <div class="emp-info">
                      <div class="emp-avatar">{{ emp.name.charAt(0) }}</div>
                      <div>
                        <div class="emp-name">{{ emp.name }}</div>
                        <div class="emp-role">{{ emp.role }}</div>
                      </div>
                    </div>
                  </td>
                  @for (day of weekDays(); track day.index) {
                    <td class="td-shift" [class.today]="isToday(day.date)" (click)="openShiftModal(emp, day.index)">
                      @for (shift of getShiftsFor(emp.id, day.index); track shift.id) {
                        <div class="shift-chip" 
                             [style.border-left-color]="getLocationColor(shift.locationId)"
                             [style.background]="getLocationColor(shift.locationId) + '1A'"
                             (click)="editShift(shift, $event)">
                          <div class="shift-time">{{ shift.startTime }} - {{ shift.endTime }}</div>
                          <div class="shift-loc">{{ shift.locationName.replace('Pollo Centro - ', '') }}</div>
                        </div>
                      }
                      @if (getShiftsFor(emp.id, day.index).length === 0) {
                        <div class="empty-cell-hint">+ Agregar</div>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Modals would go here (Shift Modal & Employee Modal) -->
      <!-- Simplified inline forms for the walkthrough to keep it contained -->
      
      @if (showShiftModal()) {
        <div class="modal-overlay" (click)="closeModals()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingShift() ? 'Editar Turno' : 'Asignar Turno' }}</h2>
              <button mat-icon-button (click)="closeModals()"><mat-icon>close</mat-icon></button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Empleado</label>
                <select [(ngModel)]="shiftForm.employeeId" class="pc-select" [disabled]="!!editingShift()">
                  <option value="">Seleccione un empleado...</option>
                  @for (emp of activeEmployees(); track emp.id) {
                    <option [value]="emp.id">{{ emp.name }} ({{ emp.role }})</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>Local / Sucursal</label>
                <select [(ngModel)]="shiftForm.locationId" class="pc-select">
                  <option value="">Seleccione local...</option>
                  @for (loc of dataService.locations; track loc.id) {
                    <option [value]="loc.id">{{ loc.name }}</option>
                  }
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Día de la semana</label>
                  <select [(ngModel)]="shiftForm.dayOfWeek" class="pc-select">
                    <option [value]="0">Lunes</option>
                    <option [value]="1">Martes</option>
                    <option [value]="2">Miércoles</option>
                    <option [value]="3">Jueves</option>
                    <option [value]="4">Viernes</option>
                    <option [value]="5">Sábado</option>
                    <option [value]="6">Domingo</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Hora Inicio</label>
                  <input type="time" [(ngModel)]="shiftForm.startTime" class="pc-input">
                </div>
                <div class="form-group">
                  <label>Hora Fin</label>
                  <input type="time" [(ngModel)]="shiftForm.endTime" class="pc-input">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              @if (editingShift()) {
                <button class="btn-danger" (click)="deleteShift()">Eliminar</button>
              }
              <div class="spacer"></div>
              <button class="btn-secondary" (click)="closeModals()">Cancelar</button>
              <button class="btn-primary" (click)="saveShift()">Guardar Turno</button>
            </div>
          </div>
        </div>
      }

      @if (showEmployeeModal()) {
        <div class="modal-overlay" (click)="closeModals()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Nuevo Empleado</h2>
              <button mat-icon-button (click)="closeModals()"><mat-icon>close</mat-icon></button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Nombre Completo</label>
                <input type="text" [(ngModel)]="employeeForm.name" class="pc-input" placeholder="Ej. Juan Pérez">
              </div>
              <div class="form-group">
                <label>Rol / Posición</label>
                <input type="text" [(ngModel)]="employeeForm.role" class="pc-input" placeholder="Ej. Cocinero, Cajera">
              </div>
              <div class="form-group">
                <label>Teléfono (Opcional)</label>
                <input type="text" [(ngModel)]="employeeForm.phone" class="pc-input" placeholder="Ej. 809-555-5555">
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeModals()">Cancelar</button>
              <button class="btn-primary" (click)="saveEmployee()">Guardar Empleado</button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .schedule-page {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* ---- Header & Nav ---- */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .header-text h1 {
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

    .header-text p {
      color: var(--pc-text-muted);
      font-size: 0.9rem;
    }

    .week-navigator {
      display: flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      padding: 8px 16px;
      backdrop-filter: blur(10px);
    }

    .current-week {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 140px;
    }

    .current-week span {
      font-weight: 700;
      font-size: 1rem;
      color: var(--pc-text-primary);
    }

    .current-week small {
      font-size: 0.75rem;
      color: var(--pc-text-muted);
    }

    .current-week mat-icon {
      display: none;
    }

    .btn-today {
      background: rgba(242, 201, 76, 0.1);
      color: var(--pc-yellow);
      border: 1px solid rgba(242, 201, 76, 0.2);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      margin-left: 8px;
      transition: all var(--pc-transition-fast);
    }

    .btn-today:hover {
      background: rgba(242, 201, 76, 0.2);
    }

    /* ---- Stats ---- */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5));
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--pc-radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon mat-icon { color: white; }
    .s-blue { background: linear-gradient(135deg, #3B82F6, #2563EB); }
    .s-green { background: linear-gradient(135deg, #10B981, #059669); }
    .s-purple { background: linear-gradient(135deg, #8B5CF6, #6D28D9); }
    .s-orange { background: linear-gradient(135deg, #F59E0B, #D97706); }

    .stat-info { display: flex; flex-direction: column; }
    .stat-val { font-size: 1.4rem; font-weight: 700; font-family: var(--pc-font-heading); line-height: 1.2; }
    .stat-lbl { font-size: 0.75rem; color: var(--pc-text-muted); }

    /* ---- Toolbar ---- */
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .filters {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .view-toggle {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--pc-border);
      color: var(--pc-text-secondary);
      padding: 6px 12px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--pc-transition-fast);
    }

    .view-toggle mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .view-toggle:hover { background: rgba(255, 255, 255, 0.1); }
    .view-toggle.active {
      background: var(--pc-yellow);
      color: #1A1A2E;
      border-color: var(--pc-yellow);
      font-weight: 700;
    }

    .location-legend {
      display: flex;
      gap: 12px;
      margin-left: 16px;
      padding-left: 16px;
      border-left: 1px solid var(--pc-border);
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--pc-text-muted);
    }

    .legend-color {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .actions {
      display: flex;
      gap: 12px;
    }

    /* ---- Grid ---- */
    .schedule-grid-container {
      background: rgba(22, 33, 62, 0.4);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      overflow-x: auto;
    }

    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 1000px;
    }

    .schedule-table th, .schedule-table td {
      border: 1px solid var(--pc-border);
      padding: 12px;
      vertical-align: top;
    }

    .schedule-table th {
      background: rgba(0, 0, 0, 0.2);
      font-weight: 600;
      text-align: center;
    }

    .th-employee {
      width: 220px;
      text-align: left !important;
      padding-left: 20px !important;
      color: var(--pc-text-muted);
      font-size: 0.85rem;
    }

    .th-day {
      width: calc((100% - 220px) / 7);
    }

    .day-name { color: var(--pc-text-primary); font-size: 0.9rem; }
    .day-date { color: var(--pc-text-muted); font-size: 0.75rem; margin-top: 2px; }

    .th-day.today, .td-shift.today {
      background: rgba(242, 201, 76, 0.03);
    }

    .th-day.today .day-name {
      color: var(--pc-yellow);
      font-weight: 700;
    }

    .td-employee {
      background: rgba(0, 0, 0, 0.1);
    }

    .emp-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .emp-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: var(--pc-text-primary);
    }

    .emp-name { font-weight: 600; font-size: 0.9rem; }
    .emp-role { font-size: 0.75rem; color: var(--pc-text-muted); margin-top: 2px; }

    .td-shift {
      position: relative;
      cursor: pointer;
      transition: background var(--pc-transition-fast);
      min-height: 80px;
    }

    .td-shift:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .empty-cell-hint {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--pc-yellow);
      font-size: 0.8rem;
      font-weight: 600;
      opacity: 0;
      transition: opacity var(--pc-transition-fast);
    }

    .td-shift:hover .empty-cell-hint {
      opacity: 1;
    }

    .shift-chip {
      background: rgba(59, 130, 246, 0.1);
      border-left: 3px solid #3B82F6;
      border-radius: 4px;
      padding: 6px 8px;
      margin-bottom: 6px;
      position: relative;
      z-index: 2;
      transition: transform var(--pc-transition-fast);
    }

    .shift-chip:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .shift-time { font-weight: 700; font-size: 0.8rem; color: var(--pc-text-primary); }
    .shift-loc { font-size: 0.7rem; color: var(--pc-text-secondary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ---- Modals ---- */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-content {
      background: var(--pc-bg-sidebar);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-lg);
      width: 100%;
      max-width: 500px;
      box-shadow: var(--pc-shadow-xl);
      animation: modalSlideIn 0.3s ease;
    }

    @keyframes modalSlideIn {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--pc-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h2 { font-family: var(--pc-font-heading); font-size: 1.2rem; }

    .modal-body { padding: 24px; }
    
    .form-group { margin-bottom: 16px; flex: 1; }
    .form-group label { display: block; margin-bottom: 8px; font-size: 0.85rem; color: var(--pc-text-secondary); }
    .form-row { display: flex; gap: 16px; }

    .pc-input, .pc-select {
      width: 100%;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-md);
      padding: 10px 14px;
      color: var(--pc-text-primary);
      font-family: var(--pc-font-body);
      font-size: 0.95rem;
      transition: all var(--pc-transition-fast);
    }
    .pc-input:focus, .pc-select:focus { outline: none; border-color: var(--pc-yellow); background: rgba(0, 0, 0, 0.4); }
    .pc-select option { background: var(--pc-bg-sidebar); }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--pc-border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .spacer { flex: 1; }

    .btn-primary {
      background: var(--pc-yellow);
      color: #1A1A2E;
      border: none;
      padding: 8px 16px;
      border-radius: var(--pc-radius-md);
      font-weight: 600;
      cursor: pointer;
      display: flex; align-items: center; gap: 6px;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--pc-text-primary);
      border: 1px solid var(--pc-border);
      padding: 8px 16px;
      border-radius: var(--pc-radius-md);
      font-weight: 500;
      cursor: pointer;
      display: flex; align-items: center; gap: 6px;
    }
    .btn-danger {
      background: rgba(239, 68, 68, 0.1);
      color: #EF4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 8px 16px;
      border-radius: var(--pc-radius-md);
      font-weight: 500;
      cursor: pointer;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .stats-bar { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .stats-bar { grid-template-columns: 1fr; }
      .toolbar { flex-direction: column; align-items: stretch; }
      .actions { justify-content: flex-end; }
    }
  `]
})
export class ScheduleComponent implements OnInit {
  
  currentDate = signal(new Date());
  viewMode = signal<'employee' | 'location'>('employee');
  
  // Modals state
  showShiftModal = signal(false);
  showEmployeeModal = signal(false);
  editingShift = signal<ScheduleShift | null>(null);

  // Forms
  shiftForm = {
    employeeId: '',
    locationId: '',
    dayOfWeek: 0,
    startTime: '08:00',
    endTime: '16:00'
  };

  employeeForm = {
    name: '',
    role: '',
    phone: ''
  };

  // Colors for locations
  private locationColors: Record<string, string> = {
    'loc-union': '#3B82F6',     // Blue
    'loc-broadway': '#10B981',  // Green
    'loc-haverhill': '#F59E0B', // Amber
    'loc-lynn': '#8B5CF6',      // Purple
    'loc-prep': '#EC4899',      // Pink
    'loc-worcester': '#14B8A6'  // Teal
  };

  constructor(
    public dataService: DataService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    // Force to beginning of current week
    this.goToCurrentWeek();
  }

  // --- Computed / State ---

  activeEmployees = computed(() => this.dataService.employees().filter(e => e.active));
  
  currentWeekKey = computed(() => {
    const d = new Date(this.currentDate());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  });

  currentWeekNumber = computed(() => {
    return this.currentWeekKey().split('-W')[1];
  });

  currentWeekShifts = computed(() => {
    return this.dataService.getShiftsForWeek(this.currentWeekKey());
  });

  activeLocationsCount = computed(() => {
    const shifts = this.currentWeekShifts();
    const locs = new Set(shifts.map(s => s.locationId));
    return locs.size;
  });

  totalHours = computed(() => {
    let hours = 0;
    this.currentWeekShifts().forEach(s => {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      hours += (eh + em/60) - (sh + sm/60);
    });
    return Math.round(hours);
  });

  weekDays = computed<DayColumn[]>(() => {
    const days: DayColumn[] = [];
    const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const short = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    
    // Get Monday of current week
    const curr = new Date(this.currentDate());
    const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(first));

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      days.push({
        index: i,
        name: names[i],
        shortName: short[i],
        date: date
      });
    }
    return days;
  });

  weekDateRange = computed(() => {
    const days = this.weekDays();
    const first = days[0].date;
    const last = days[6].date;
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${first.toLocaleDateString('es', options)} - ${last.toLocaleDateString('es', options)}`;
  });

  // --- Methods ---

  getLocationColor(locId: string): string {
    return this.locationColors[locId] || '#6C6C80';
  }

  changeWeek(offset: number) {
    const d = new Date(this.currentDate());
    d.setDate(d.getDate() + (offset * 7));
    this.currentDate.set(d);
  }

  goToCurrentWeek() {
    this.currentDate.set(new Date());
  }

  isCurrentWeek(): boolean {
    return this.currentWeekKey() === this.dataService.getCurrentWeekKey();
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  getShiftsFor(employeeId: string, dayIndex: number): ScheduleShift[] {
    return this.currentWeekShifts().filter(s => 
      s.employeeId === employeeId && s.dayOfWeek === dayIndex
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  // --- Modal Logic ---

  openShiftModal(employee?: Employee, dayIndex?: number) {
    this.editingShift.set(null);
    this.shiftForm = {
      employeeId: employee?.id || '',
      locationId: '',
      dayOfWeek: dayIndex ?? 0,
      startTime: '08:00',
      endTime: '16:00'
    };
    this.showShiftModal.set(true);
  }

  editShift(shift: ScheduleShift, event: Event) {
    event.stopPropagation();
    this.editingShift.set(shift);
    this.shiftForm = {
      employeeId: shift.employeeId,
      locationId: shift.locationId,
      dayOfWeek: shift.dayOfWeek,
      startTime: shift.startTime,
      endTime: shift.endTime
    };
    this.showShiftModal.set(true);
  }

  saveShift() {
    if (!this.shiftForm.employeeId || !this.shiftForm.locationId) return;

    const emp = this.dataService.employees().find(e => e.id === this.shiftForm.employeeId);
    const loc = this.dataService.locations.find(l => l.id === this.shiftForm.locationId);
    
    if (!emp || !loc) return;

    const shiftData = {
      employeeId: emp.id,
      employeeName: emp.name,
      locationId: loc.id,
      locationName: loc.name,
      dayOfWeek: Number(this.shiftForm.dayOfWeek),
      startTime: this.shiftForm.startTime,
      endTime: this.shiftForm.endTime,
      weekKey: this.currentWeekKey()
    };

    if (this.editingShift()) {
      this.dataService.updateShift(this.editingShift()!.id, shiftData);
    } else {
      this.dataService.addShift(shiftData);
    }
    
    this.closeModals();
  }

  deleteShift() {
    if (this.editingShift() && confirm('¿Eliminar este turno?')) {
      this.dataService.deleteShift(this.editingShift()!.id);
      this.closeModals();
    }
  }

  openEmployeeModal() {
    this.employeeForm = { name: '', role: '', phone: '' };
    this.showEmployeeModal.set(true);
  }

  saveEmployee() {
    if (!this.employeeForm.name || !this.employeeForm.role) return;
    
    this.dataService.addEmployee({
      name: this.employeeForm.name,
      role: this.employeeForm.role,
      phone: this.employeeForm.phone,
      active: true
    });
    
    this.closeModals();
  }

  closeModals() {
    this.showShiftModal.set(false);
    this.showEmployeeModal.set(false);
    this.editingShift.set(null);
  }
}
