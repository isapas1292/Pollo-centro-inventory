import { Component, computed, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DataService } from '../../core/services/data.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ScheduleShift, Employee } from '../../core/models';

interface DayColumn { index: number; name: string; shortName: string; date: Date; }

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

@Component({
  selector: 'app-schedule',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="schedule-page animate-fade-in-up">
      <!-- Header & Navigator -->
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">calendar_month</mat-icon> Horarios Semanales</h1>
          <p>Gestiona el personal y los turnos en todas las sucursales</p>
        </div>

        <div class="week-navigator">
          <button mat-icon-button (click)="changeWeek(-1)" matTooltip="Semana Anterior"><mat-icon>chevron_left</mat-icon></button>
          <div class="current-week">
            <span>Semana {{ currentWeekNumber() }}</span>
            <small>{{ weekDateRange() }}</small>
          </div>
          <button mat-icon-button (click)="changeWeek(1)" matTooltip="Semana Siguiente"><mat-icon>chevron_right</mat-icon></button>
          <button class="btn-today" (click)="goToCurrentWeek()" *ngIf="!isCurrentWeek()">Hoy</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-bar stagger-children">
        <div class="stat-card"><div class="stat-icon s-blue"><mat-icon>people</mat-icon></div>
          <div class="stat-info"><span class="stat-val">{{ activeEmployees().length }}</span><span class="stat-lbl">Empleados Activos</span></div></div>
        <div class="stat-card"><div class="stat-icon s-green"><mat-icon>event_available</mat-icon></div>
          <div class="stat-info"><span class="stat-val">{{ currentWeekShifts().length }}</span><span class="stat-lbl">Turnos esta semana</span></div></div>
        <div class="stat-card"><div class="stat-icon s-purple"><mat-icon>storefront</mat-icon></div>
          <div class="stat-info"><span class="stat-val">{{ activeLocationsCount() }}</span><span class="stat-lbl">Locales con turnos</span></div></div>
        <div class="stat-card"><div class="stat-icon s-orange"><mat-icon>schedule</mat-icon></div>
          <div class="stat-info"><span class="stat-val">{{ totalHours() }}</span><span class="stat-lbl">Horas Programadas</span></div></div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab" [class.active]="view() === 'horario'" (click)="view.set('horario')"><mat-icon>grid_view</mat-icon> Horario Semanal</button>
        <button class="tab" [class.active]="view() === 'empleados'" (click)="view.set('empleados')"><mat-icon>badge</mat-icon> Empleados</button>
      </div>

      <!-- ===================== HORARIO ===================== -->
      @if (view() === 'horario') {
        <div class="toolbar">
          <div class="location-legend">
            @for (loc of dataService.locations(); track loc.id) {
              <div class="legend-item"><div class="legend-color" [style.background]="getLocationColor(loc.id)"></div><span>{{ shortLoc(loc.name) }}</span></div>
            }
          </div>
          <div class="actions">
            <button class="btn-secondary" (click)="openAutoModal()"><mat-icon>auto_awesome</mat-icon> Generar Automático</button>
            <button class="btn-primary" (click)="openShiftModal()"><mat-icon>add</mat-icon> Asignar Turno</button>
          </div>
        </div>

        <div class="schedule-grid-container">
          <table class="schedule-table">
            <thead>
              <tr>
                <th class="th-employee">Empleado</th>
                @for (day of weekDays(); track day.index) {
                  <th class="th-day" [class.today]="isToday(day.date)">
                    <div class="day-name">{{ day.shortName }}</div>
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
                        <div class="emp-role">{{ emp.role }}{{ emp.locationName ? ' · ' + shortLoc(emp.locationName) : '' }}</div>
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
                          <div class="shift-loc">
                            {{ shortLoc(shift.locationName) }}
                            @if (isExtra(shift)) { <span class="extra-tag">extra</span> }
                          </div>
                        </div>
                      }
                      @if (getShiftsFor(emp.id, day.index).length === 0) {
                        <div class="empty-cell-hint">+ Agregar</div>
                      }
                    </td>
                  }
                </tr>
              }
              @if (activeEmployees().length === 0) {
                <tr><td [attr.colspan]="8" class="empty-row">No hay empleados. Agrégalos en la pestaña "Empleados".</td></tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- ===================== EMPLEADOS ===================== -->
      @if (view() === 'empleados') {
        <div class="toolbar">
          <span class="muted">{{ dataService.employees().length }} empleados registrados</span>
          <button class="btn-primary" (click)="openEmployeeModal()"><mat-icon>person_add</mat-icon> Nuevo Empleado</button>
        </div>

        <div class="emp-table-card">
          <div class="emp-row emp-head">
            <span>Empleado</span><span>Rol</span><span>Local</span><span>Teléfono</span><span>Estado</span><span class="right">Acciones</span>
          </div>
          @for (emp of dataService.employees(); track emp.id) {
            <div class="emp-row">
              <span class="emp-cell-name"><div class="emp-avatar sm">{{ emp.name.charAt(0) }}</div> {{ emp.name }}</span>
              <span>{{ emp.role }}</span>
              <span>
                @if (emp.locationName) {
                  <span class="loc-pill" [style.border-color]="getLocationColor(emp.locationId || '')"><mat-icon>store</mat-icon> {{ shortLoc(emp.locationName) }}</span>
                } @else { <span class="muted">— sin local</span> }
              </span>
              <span class="muted">{{ emp.phone || '—' }}</span>
              <span>
                <span class="status-pill" [class.on]="emp.active" [class.off]="!emp.active">{{ emp.active ? 'Activo' : 'Inactivo' }}</span>
              </span>
              <span class="right">
                <button class="icon-btn" (click)="openEmployeeModal(emp)" title="Editar"><mat-icon>edit</mat-icon></button>
                <button class="icon-btn text-red" (click)="removeEmployee(emp)" title="Eliminar"><mat-icon>delete</mat-icon></button>
              </span>
            </div>
          }
          @if (dataService.employees().length === 0) {
            <div class="emp-empty"><mat-icon>badge</mat-icon><p>Aún no hay empleados</p></div>
          }
        </div>
      }

      <!-- ===================== MODAL: TURNO ===================== -->
      @if (showShiftModal()) {
        <div class="modal-overlay" (click)="closeModals()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingShift() ? 'Editar Turno' : 'Asignar Turno' }}</h2>
              <button mat-icon-button (click)="closeModals()"><mat-icon>close</mat-icon></button>
            </div>
            <div class="modal-body">
              <!-- 1. Local primero -->
              <div class="form-group">
                <label>1 · Local / Sucursal</label>
                <select [(ngModel)]="shiftForm.locationId" (ngModelChange)="onShiftLocalChange()" class="pc-select">
                  <option value="">Seleccione local...</option>
                  @for (loc of dataService.locations(); track loc.id) { <option [value]="loc.id">{{ loc.name }}</option> }
                </select>
              </div>

              <!-- 2. Empleado del local -->
              <div class="form-group">
                <label>2 · Empleado
                  <span class="hint-count" *ngIf="shiftForm.locationId">({{ shiftEmployees().length }} disponibles)</span>
                </label>
                <select [(ngModel)]="shiftForm.employeeId" class="pc-select" [disabled]="!!editingShift()">
                  <option value="">Seleccione un empleado...</option>
                  @for (emp of shiftEmployees(); track emp.id) {
                    <option [value]="emp.id">{{ emp.name }} ({{ emp.role }}){{ isEmpExtra(emp) ? ' · extra' : '' }}</option>
                  }
                </select>
                @if (!editingShift()) {
                  <label class="check-inline">
                    <input type="checkbox" [(ngModel)]="includeOtherLocals">
                    <span>Incluir empleados de otros locales (extra / cobertura)</span>
                  </label>
                }
              </div>

              <!-- 3. Días -->
              @if (!editingShift()) {
                <div class="form-group">
                  <label>3 · Días (elige uno o varios)</label>
                  <div class="day-toggles">
                    @for (d of dayList; track d.i) {
                      <button type="button" class="day-toggle" [class.on]="shiftForm.days[d.i]" (click)="toggleDay(d.i)">{{ d.s }}</button>
                    }
                  </div>
                </div>
              } @else {
                <div class="form-group">
                  <label>Día</label>
                  <div class="readonly-box">{{ dayName(shiftForm.dayOfWeek) }}</div>
                </div>
              }

              <!-- 4. Horas -->
              <div class="form-row">
                <div class="form-group"><label>Hora Inicio</label><input type="time" [(ngModel)]="shiftForm.startTime" class="pc-input"></div>
                <div class="form-group"><label>Hora Fin</label><input type="time" [(ngModel)]="shiftForm.endTime" class="pc-input"></div>
              </div>
            </div>
            <div class="modal-footer">
              @if (editingShift()) { <button class="btn-danger" (click)="deleteShift()">Eliminar</button> }
              <div class="spacer"></div>
              <button class="btn-secondary" (click)="closeModals()">Cancelar</button>
              <button class="btn-primary" (click)="saveShift()">{{ editingShift() ? 'Guardar' : 'Asignar Turno(s)' }}</button>
            </div>
          </div>
        </div>
      }

      <!-- ===================== MODAL: EMPLEADO ===================== -->
      @if (showEmployeeModal()) {
        <div class="modal-overlay" (click)="closeModals()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ employeeForm.id ? 'Editar Empleado' : 'Nuevo Empleado' }}</h2>
              <button mat-icon-button (click)="closeModals()"><mat-icon>close</mat-icon></button>
            </div>
            <div class="modal-body">
              <div class="form-group"><label>Nombre Completo</label>
                <input type="text" [(ngModel)]="employeeForm.name" class="pc-input" placeholder="Ej. Juan Pérez"></div>
              <div class="form-group"><label>Rol / Posición</label>
                <input type="text" [(ngModel)]="employeeForm.role" class="pc-input" placeholder="Ej. Cocinero, Cajera"></div>
              <div class="form-group"><label>Local de casa</label>
                <select [(ngModel)]="employeeForm.locationId" class="pc-select">
                  <option value="">Sin local asignado</option>
                  @for (loc of dataService.locations(); track loc.id) { <option [value]="loc.id">{{ loc.name }}</option> }
                </select>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Teléfono (Opcional)</label>
                  <input type="text" [(ngModel)]="employeeForm.phone" class="pc-input" placeholder="809-555-5555"></div>
                @if (employeeForm.id) {
                  <div class="form-group"><label>Estado</label>
                    <select [(ngModel)]="employeeForm.active" class="pc-select">
                      <option [ngValue]="true">Activo</option>
                      <option [ngValue]="false">Inactivo</option>
                    </select>
                  </div>
                }
              </div>
            </div>
            <div class="modal-footer">
              <div class="spacer"></div>
              <button class="btn-secondary" (click)="closeModals()">Cancelar</button>
              <button class="btn-primary" (click)="saveEmployee()">Guardar Empleado</button>
            </div>
          </div>
        </div>
      }

      <!-- ===================== MODAL: AUTO ===================== -->
      @if (showAutoModal()) {
        <div class="modal-overlay" (click)="closeModals()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2><mat-icon class="head-ic">auto_awesome</mat-icon> Generar Horario Automático</h2>
              <button mat-icon-button (click)="closeModals()"><mat-icon>close</mat-icon></button>
            </div>
            <div class="modal-body">
              <p class="auto-desc">Genera los turnos de la <strong>Semana {{ currentWeekNumber() }}</strong> según estos parámetros.</p>

              <div class="form-group">
                <label>Días de operación</label>
                <div class="day-toggles">
                  @for (d of dayList; track d.i) {
                    <button type="button" class="day-toggle" [class.on]="autoForm.days[d.i]" (click)="autoForm.days[d.i] = !autoForm.days[d.i]">{{ d.s }}</button>
                  }
                </div>
              </div>

              <div class="form-group">
                <label class="check-inline"><input type="checkbox" [(ngModel)]="autoForm.useMorning"><span>Turno Mañana</span></label>
                <div class="form-row" [class.dim]="!autoForm.useMorning">
                  <div class="form-group"><label>Inicio</label><input type="time" [(ngModel)]="autoForm.morningStart" class="pc-input"></div>
                  <div class="form-group"><label>Fin</label><input type="time" [(ngModel)]="autoForm.morningEnd" class="pc-input"></div>
                </div>
              </div>

              <div class="form-group">
                <label class="check-inline"><input type="checkbox" [(ngModel)]="autoForm.useAfternoon"><span>Turno Tarde</span></label>
                <div class="form-row" [class.dim]="!autoForm.useAfternoon">
                  <div class="form-group"><label>Inicio</label><input type="time" [(ngModel)]="autoForm.afternoonStart" class="pc-input"></div>
                  <div class="form-group"><label>Fin</label><input type="time" [(ngModel)]="autoForm.afternoonEnd" class="pc-input"></div>
                </div>
              </div>

              <label class="check-inline big">
                <input type="checkbox" [(ngModel)]="autoForm.distribute">
                <span>Repartir empleados entre locales <small>(en vez de cada quien en su local)</small></span>
              </label>
              <label class="check-inline">
                <input type="checkbox" [(ngModel)]="autoForm.replace">
                <span>Reemplazar los turnos existentes de esta semana</span>
              </label>
            </div>
            <div class="modal-footer">
              <div class="spacer"></div>
              <button class="btn-secondary" (click)="closeModals()">Cancelar</button>
              <button class="btn-primary" (click)="generateAuto()"><mat-icon>auto_awesome</mat-icon> Generar</button>
            </div>
          </div>
        </div>
      }

      @if (toast(); as t) { <div class="toast animate-fade-in-up"><mat-icon>check_circle</mat-icon><span>{{ t }}</span></div> }
    </div>
  `,
  styles: [`
    .schedule-page { max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-text h1 { font-family: var(--pc-font-heading); font-size: 1.8rem; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: var(--pc-yellow); }
    .header-text p { color: var(--pc-text-muted); font-size: 0.9rem; }
    .week-navigator { display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, rgba(22,33,62,0.7), rgba(26,26,46,0.5)); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg); padding: 8px 16px; }
    .current-week { display: flex; flex-direction: column; align-items: center; min-width: 130px; }
    .current-week span { font-weight: 700; font-size: 1rem; }
    .current-week small { font-size: 0.75rem; color: var(--pc-text-muted); }
    .btn-today { background: rgba(242,201,76,0.1); color: var(--pc-yellow); border: 1px solid rgba(242,201,76,0.2); border-radius: 20px; padding: 4px 12px; font-size: 0.75rem; font-weight: 600; cursor: pointer; }

    .stats-bar { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: linear-gradient(135deg, rgba(22,33,62,0.7), rgba(26,26,46,0.5)); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg); padding: 16px 20px; display: flex; align-items: center; gap: 16px; }
    .stat-icon { width: 44px; height: 44px; border-radius: var(--pc-radius-md); display: flex; align-items: center; justify-content: center; }
    .stat-icon mat-icon { color: white; }
    .s-blue { background: linear-gradient(135deg,#3B82F6,#2563EB); } .s-green { background: linear-gradient(135deg,#10B981,#059669); }
    .s-purple { background: linear-gradient(135deg,#8B5CF6,#6D28D9); } .s-orange { background: linear-gradient(135deg,#F59E0B,#D97706); }
    .stat-info { display: flex; flex-direction: column; } .stat-val { font-size: 1.4rem; font-weight: 700; font-family: var(--pc-font-heading); line-height: 1.2; } .stat-lbl { font-size: 0.75rem; color: var(--pc-text-muted); }

    .tabs { display: flex; gap: 8px; margin-bottom: 18px; border-bottom: 1px solid var(--pc-border); }
    .tab { background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--pc-text-secondary); padding: 10px 16px; font-weight: 600; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .tab mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .tab:hover { color: var(--pc-text-primary); }
    .tab.active { color: var(--pc-yellow); border-bottom-color: var(--pc-yellow); }

    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 16px; }
    .muted { color: var(--pc-text-muted); font-size: 0.88rem; }
    .location-legend { display: flex; gap: 12px; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--pc-text-muted); }
    .legend-color { width: 10px; height: 10px; border-radius: 50%; }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; }

    .schedule-grid-container { background: rgba(22,33,62,0.4); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg); overflow-x: auto; }
    .schedule-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
    .schedule-table th, .schedule-table td { border: 1px solid var(--pc-border); padding: 12px; vertical-align: top; }
    .schedule-table th { background: rgba(0,0,0,0.2); font-weight: 600; text-align: center; }
    .th-employee { width: 220px; text-align: left !important; padding-left: 20px !important; color: var(--pc-text-muted); font-size: 0.85rem; }
    .th-day { width: calc((100% - 220px)/7); }
    .day-name { font-size: 0.9rem; } .day-date { color: var(--pc-text-muted); font-size: 0.75rem; margin-top: 2px; }
    .th-day.today, .td-shift.today { background: rgba(242,201,76,0.03); }
    .th-day.today .day-name { color: var(--pc-yellow); font-weight: 700; }
    .td-employee { background: rgba(0,0,0,0.1); }
    .emp-info { display: flex; align-items: center; gap: 12px; }
    .emp-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-weight: 700; }
    .emp-avatar.sm { width: 28px; height: 28px; font-size: 0.85rem; }
    .emp-name { font-weight: 600; font-size: 0.9rem; } .emp-role { font-size: 0.72rem; color: var(--pc-text-muted); margin-top: 2px; }
    .td-shift { position: relative; cursor: pointer; min-height: 80px; }
    .td-shift:hover { background: rgba(255,255,255,0.02); }
    .empty-cell-hint { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--pc-yellow); font-size: 0.8rem; font-weight: 600; opacity: 0; }
    .td-shift:hover .empty-cell-hint { opacity: 1; }
    .shift-chip { background: rgba(59,130,246,0.1); border-left: 3px solid #3B82F6; border-radius: 4px; padding: 6px 8px; margin-bottom: 6px; }
    .shift-chip:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .shift-time { font-weight: 700; font-size: 0.8rem; }
    .shift-loc { font-size: 0.7rem; color: var(--pc-text-secondary); margin-top: 2px; display: flex; align-items: center; gap: 4px; }
    .extra-tag { background: rgba(245,158,11,0.2); color: #FBBF24; border-radius: 8px; padding: 0 6px; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; }
    .empty-row { text-align: center; color: var(--pc-text-muted); padding: 40px !important; }

    /* Empleados table */
    .emp-table-card { background: linear-gradient(135deg, rgba(22,33,62,0.6), rgba(26,26,46,0.4)); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg); overflow: hidden; }
    .emp-row { display: grid; grid-template-columns: 1.6fr 1.1fr 1.3fr 1.1fr 0.8fr 0.9fr; gap: 12px; padding: 14px 20px; align-items: center; border-bottom: 1px solid var(--pc-border); font-size: 0.88rem; }
    .emp-row:last-child { border-bottom: none; }
    .emp-head { background: rgba(0,0,0,0.2); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pc-text-muted); font-weight: 700; }
    .emp-cell-name { display: flex; align-items: center; gap: 10px; font-weight: 600; }
    .loc-pill { display: inline-flex; align-items: center; gap: 4px; border: 1px solid; border-radius: 12px; padding: 2px 8px; font-size: 0.75rem; font-weight: 600; }
    .loc-pill mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .status-pill { padding: 2px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; }
    .status-pill.on { background: rgba(16,185,129,0.12); color: #34D399; } .status-pill.off { background: rgba(239,68,68,0.12); color: #F87171; }
    .right { text-align: right; }
    .icon-btn { background: transparent; border: none; color: var(--pc-text-muted); cursor: pointer; padding: 4px; border-radius: 4px; }
    .icon-btn:hover { color: var(--pc-yellow); background: rgba(242,201,76,0.1); }
    .icon-btn.text-red:hover { color: #EF4444; background: rgba(239,68,68,0.1); }
    .emp-empty { display: flex; flex-direction: column; align-items: center; padding: 50px; color: var(--pc-text-muted); gap: 8px; }
    .emp-empty mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.3; }

    /* Modals */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-content { background: var(--pc-bg-sidebar); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg); width: 100%; max-width: 520px; max-height: 92vh; overflow-y: auto; box-shadow: var(--pc-shadow-xl); }
    .modal-header { padding: 18px 24px; border-bottom: 1px solid var(--pc-border); display: flex; justify-content: space-between; align-items: center; }
    .modal-header h2 { font-family: var(--pc-font-heading); font-size: 1.2rem; display: flex; align-items: center; gap: 8px; }
    .head-ic { color: var(--pc-yellow); }
    .modal-body { padding: 24px; }
    .form-group { margin-bottom: 16px; flex: 1; }
    .form-group label { display: block; margin-bottom: 8px; font-size: 0.85rem; color: var(--pc-text-secondary); }
    .hint-count { color: var(--pc-text-muted); font-size: 0.78rem; }
    .form-row { display: flex; gap: 16px; }
    .form-row.dim { opacity: 0.45; pointer-events: none; }
    .pc-input, .pc-select { width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-md); padding: 10px 14px; color: var(--pc-text-primary); font-family: var(--pc-font-body); font-size: 0.95rem; }
    .pc-input:focus, .pc-select:focus { outline: none; border-color: var(--pc-yellow); }
    .pc-select option { background: var(--pc-bg-sidebar); }
    .readonly-box { background: rgba(0,0,0,0.2); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-md); padding: 10px 14px; color: var(--pc-text-muted); }
    .check-inline { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--pc-text-secondary); margin-top: 10px; cursor: pointer; }
    .check-inline input { width: 16px; height: 16px; accent-color: var(--pc-yellow); cursor: pointer; }
    .check-inline.big { font-size: 0.9rem; color: var(--pc-text-primary); font-weight: 600; }
    .check-inline small { color: var(--pc-text-muted); font-weight: 400; }
    .day-toggles { display: flex; gap: 6px; flex-wrap: wrap; }
    .day-toggle { background: rgba(255,255,255,0.05); border: 1px solid var(--pc-border); color: var(--pc-text-secondary); border-radius: 8px; padding: 8px 12px; font-size: 0.82rem; font-weight: 600; cursor: pointer; min-width: 46px; }
    .day-toggle.on { background: var(--pc-yellow); color: #1A1A2E; border-color: var(--pc-yellow); }
    .auto-desc { color: var(--pc-text-secondary); font-size: 0.9rem; margin-bottom: 16px; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid var(--pc-border); display: flex; justify-content: flex-end; gap: 12px; align-items: center; }
    .spacer { flex: 1; }
    .btn-primary { background: var(--pc-yellow); color: #1A1A2E; border: none; padding: 9px 16px; border-radius: var(--pc-radius-md); font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .btn-secondary { background: rgba(255,255,255,0.05); color: var(--pc-text-primary); border: 1px solid var(--pc-border); padding: 9px 16px; border-radius: var(--pc-radius-md); font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .btn-danger { background: rgba(239,68,68,0.1); color: #EF4444; border: 1px solid rgba(239,68,68,0.3); padding: 9px 16px; border-radius: var(--pc-radius-md); font-weight: 500; cursor: pointer; }

    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #065F46; color: #ECFDF5; border: 1px solid #10B981; padding: 12px 18px; border-radius: var(--pc-radius-md); box-shadow: 0 10px 30px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 8px; font-weight: 600; z-index: 1100; }
    .toast mat-icon { color: #34D399; }

    @media (max-width: 1024px) { .stats-bar { grid-template-columns: repeat(2,1fr); } }
    @media (max-width: 768px) { .stats-bar { grid-template-columns: 1fr; } .emp-row { grid-template-columns: 1fr 1fr; } .emp-head { display: none; } }
  `]
})
export class ScheduleComponent implements OnInit {
  currentDate = signal(new Date());
  view = signal<'horario' | 'empleados'>('horario');

  showShiftModal = signal(false);
  showEmployeeModal = signal(false);
  showAutoModal = signal(false);
  editingShift = signal<ScheduleShift | null>(null);
  toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  includeOtherLocals = false;
  readonly dayList = DAY_SHORT.map((s, i) => ({ i, s }));

  shiftForm = { employeeId: '', locationId: '', dayOfWeek: 0, days: [false, false, false, false, false, false, false], startTime: '08:00', endTime: '16:00' };
  employeeForm = { id: '', name: '', role: '', phone: '', locationId: '', active: true };
  autoForm = {
    days: [true, true, true, true, true, true, false],
    useMorning: true, morningStart: '07:00', morningEnd: '13:00',
    useAfternoon: true, afternoonStart: '13:00', afternoonEnd: '21:00',
    distribute: false, replace: true,
  };

  private palette = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#EF4444', '#6366F1'];

  constructor(public dataService: DataService, private confirm: ConfirmService) {}

  ngOnInit() { this.goToCurrentWeek(); }

  // --- Computed ---
  activeEmployees = computed(() => this.dataService.employees().filter(e => e.active));

  currentWeekKey = computed(() => {
    const d = new Date(this.currentDate()); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  });
  currentWeekNumber = computed(() => this.currentWeekKey().split('-W')[1]);
  currentWeekShifts = computed(() => this.dataService.getShiftsForWeek(this.currentWeekKey()));
  activeLocationsCount = computed(() => new Set(this.currentWeekShifts().map(s => s.locationId)).size);

  totalHours = computed(() => {
    let hours = 0;
    this.currentWeekShifts().forEach(s => {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      hours += (eh + em / 60) - (sh + sm / 60);
    });
    return Math.round(hours);
  });

  weekDays = computed<DayColumn[]>(() => {
    const days: DayColumn[] = [];
    const curr = new Date(this.currentDate());
    const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(first));
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday); date.setDate(monday.getDate() + i);
      days.push({ index: i, name: DAY_NAMES[i], shortName: DAY_SHORT[i], date });
    }
    return days;
  });

  weekDateRange = computed(() => {
    const days = this.weekDays();
    const o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${days[0].date.toLocaleDateString('es', o)} - ${days[6].date.toLocaleDateString('es', o)}`;
  });

  /** Empleados disponibles para el turno: del local elegido, o todos si se incluye "extra". */
  shiftEmployees(): Employee[] {
    const all = this.activeEmployees();
    if (this.includeOtherLocals || !this.shiftForm.locationId) return all;
    const filtered = all.filter(e => e.locationId === this.shiftForm.locationId);
    return filtered.length > 0 ? filtered : all;
  }

  // --- Helpers ---
  shortLoc(name: string): string { return (name || '').replace('Pollo Centro - ', ''); }
  dayName(i: number): string { return DAY_NAMES[i] ?? ''; }

  getLocationColor(locId: string): string {
    const idx = this.dataService.locations().findIndex(l => l.id === locId);
    return idx >= 0 ? this.palette[idx % this.palette.length] : '#6C6C80';
  }

  isExtra(shift: ScheduleShift): boolean {
    const emp = this.dataService.employees().find(e => e.id === shift.employeeId);
    return !!emp?.locationId && emp.locationId !== shift.locationId;
  }
  isEmpExtra(emp: Employee): boolean {
    return !!this.shiftForm.locationId && !!emp.locationId && emp.locationId !== this.shiftForm.locationId;
  }

  changeWeek(offset: number) { const d = new Date(this.currentDate()); d.setDate(d.getDate() + offset * 7); this.currentDate.set(d); }
  goToCurrentWeek() { this.currentDate.set(new Date()); }
  isCurrentWeek(): boolean { return this.currentWeekKey() === this.dataService.getCurrentWeekKey(); }
  isToday(date: Date): boolean {
    const t = new Date();
    return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
  }
  getShiftsFor(employeeId: string, dayIndex: number): ScheduleShift[] {
    return this.currentWeekShifts().filter(s => s.employeeId === employeeId && s.dayOfWeek === dayIndex)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  // --- Shift modal ---
  openShiftModal(employee?: Employee, dayIndex?: number) {
    this.editingShift.set(null);
    this.includeOtherLocals = false;
    const days = [false, false, false, false, false, false, false];
    if (dayIndex !== undefined) days[dayIndex] = true;
    this.shiftForm = {
      employeeId: employee?.id || '',
      locationId: employee?.locationId || '',
      dayOfWeek: dayIndex ?? 0,
      days,
      startTime: '08:00', endTime: '16:00',
    };
    this.showShiftModal.set(true);
  }

  onShiftLocalChange() {
    // Si el empleado elegido no pertenece al nuevo local (y no se permiten extras), se limpia.
    if (!this.includeOtherLocals && this.shiftForm.employeeId) {
      const emp = this.dataService.employees().find(e => e.id === this.shiftForm.employeeId);
      if (emp && emp.locationId !== this.shiftForm.locationId) this.shiftForm.employeeId = '';
    }
  }

  toggleDay(i: number) { this.shiftForm.days[i] = !this.shiftForm.days[i]; }

  editShift(shift: ScheduleShift, event: Event) {
    event.stopPropagation();
    this.editingShift.set(shift);
    this.includeOtherLocals = true; // al editar permitimos ver al empleado actual
    this.shiftForm = {
      employeeId: shift.employeeId, locationId: shift.locationId, dayOfWeek: shift.dayOfWeek,
      days: [false, false, false, false, false, false, false],
      startTime: shift.startTime, endTime: shift.endTime,
    };
    this.showShiftModal.set(true);
  }

  saveShift() {
    const emp = this.dataService.employees().find(e => e.id === this.shiftForm.employeeId);
    const loc = this.dataService.locations().find(l => l.id === this.shiftForm.locationId);
    if (!emp || !loc) { this.showToast('Selecciona local y empleado'); return; }

    if (this.editingShift()) {
      this.dataService.updateShift(this.editingShift()!.id, {
        employeeId: emp.id, employeeName: emp.name, locationId: loc.id, locationName: loc.name,
        dayOfWeek: this.shiftForm.dayOfWeek, startTime: this.shiftForm.startTime, endTime: this.shiftForm.endTime,
        weekKey: this.currentWeekKey(),
      });
      this.showToast('Turno actualizado');
      this.closeModals();
      return;
    }

    const selectedDays = this.shiftForm.days.map((on, i) => on ? i : -1).filter(i => i >= 0);
    if (selectedDays.length === 0) { this.showToast('Elige al menos un día'); return; }

    const week = this.currentWeekKey();
    const shifts = selectedDays.map(day => ({
      employeeId: emp.id, employeeName: emp.name, locationId: loc.id, locationName: loc.name,
      dayOfWeek: day, startTime: this.shiftForm.startTime, endTime: this.shiftForm.endTime, weekKey: week,
    }));
    this.dataService.addShiftsBulk(shifts);
    this.showToast(`${selectedDays.length} turno(s) asignado(s) a ${emp.name}`);
    this.closeModals();
  }

  async deleteShift() {
    if (this.editingShift() && await this.confirm.ask('¿Eliminar este turno?', { confirmText: 'Eliminar' })) {
      this.dataService.deleteShift(this.editingShift()!.id);
      this.closeModals();
    }
  }

  // --- Employee modal ---
  openEmployeeModal(emp?: Employee) {
    this.employeeForm = emp
      ? { id: emp.id, name: emp.name, role: emp.role, phone: emp.phone || '', locationId: emp.locationId || '', active: emp.active }
      : { id: '', name: '', role: '', phone: '', locationId: '', active: true };
    this.showEmployeeModal.set(true);
  }

  saveEmployee() {
    if (!this.employeeForm.name || !this.employeeForm.role) { this.showToast('Nombre y rol son requeridos'); return; }
    const loc = this.dataService.locations().find(l => l.id === this.employeeForm.locationId);
    const data = {
      name: this.employeeForm.name, role: this.employeeForm.role, phone: this.employeeForm.phone,
      active: this.employeeForm.active,
      locationId: loc?.id, locationName: loc?.name,
    };
    if (this.employeeForm.id) {
      this.dataService.updateEmployee(this.employeeForm.id, data);
      this.showToast('Empleado actualizado');
    } else {
      this.dataService.addEmployee(data);
      this.showToast('Empleado agregado');
    }
    this.closeModals();
  }

  async removeEmployee(emp: Employee) {
    if (await this.confirm.ask(`¿Eliminar a ${emp.name}? Se borrarán también sus turnos.`, { confirmText: 'Eliminar' })) {
      this.dataService.deleteEmployee(emp.id);
    }
  }

  // --- Auto-generate ---
  openAutoModal() { this.showAutoModal.set(true); }

  generateAuto() {
    const emps = this.activeEmployees();
    const locs = this.dataService.locations();
    if (emps.length === 0 || locs.length === 0) { this.showToast('Necesitas empleados y locales'); return; }

    const shifts: { start: string; end: string }[] = [];
    if (this.autoForm.useMorning) shifts.push({ start: this.autoForm.morningStart, end: this.autoForm.morningEnd });
    if (this.autoForm.useAfternoon) shifts.push({ start: this.autoForm.afternoonStart, end: this.autoForm.afternoonEnd });
    if (shifts.length === 0) { this.showToast('Activa al menos un turno'); return; }

    const days = this.autoForm.days.map((on, i) => on ? i : -1).filter(i => i >= 0);
    if (days.length === 0) { this.showToast('Elige días de operación'); return; }

    const week = this.currentWeekKey();

    type Plan = { emp: Employee; loc: { id: string; name: string }; day: number; shift: { start: string; end: string } };
    const plans: Plan[] = [];

    if (!this.autoForm.distribute) {
      // Cada quien en su local, alternando turnos por índice.
      for (const loc of locs) {
        const locEmps = emps.filter(e => e.locationId === loc.id);
        for (const day of days) {
          locEmps.forEach((emp, i) => plans.push({ emp, loc, day, shift: shifts[i % shifts.length] }));
        }
      }
    } else {
      // Repartir todos los empleados entre locales × turnos (round-robin) por día.
      let idx = 0;
      for (const day of days) {
        for (const loc of locs) {
          for (const shift of shifts) {
            plans.push({ emp: emps[idx % emps.length], loc, day, shift });
            idx++;
          }
        }
      }
    }

    if (plans.length === 0) { this.showToast('No se generaron turnos (¿empleados sin local?)'); return; }

    const bulkShifts = plans.map(p => ({
      employeeId: p.emp.id, employeeName: p.emp.name, locationId: p.loc.id, locationName: p.loc.name,
      dayOfWeek: p.day, startTime: p.shift.start, endTime: p.shift.end, weekKey: week,
    }));
    // Una sola petición; reemplaza la semana en el backend si se pidió.
    this.dataService.addShiftsBulk(bulkShifts, this.autoForm.replace ? week : undefined);
    this.showToast(`Horario generado: ${plans.length} turnos`);
    this.closeModals();
  }

  closeModals() {
    this.showShiftModal.set(false);
    this.showEmployeeModal.set(false);
    this.showAutoModal.set(false);
    this.editingShift.set(null);
  }

  private showToast(message: string) {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }
}
