import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';
import { Dispatch, DispatchItem, DispatchItemType } from '../../core/models';

@Component({
  selector: 'app-dispatches',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div class="header-text">
          <h1><mat-icon class="header-icon">move_up</mat-icon> Envíos a Locales</h1>
          <p>Registra qué ingredientes o recetas se enviaron a cada local y quién lo hizo</p>
        </div>
        @if (canCreate()) {
          <button class="btn-primary" (click)="openForm()"><mat-icon>add</mat-icon> Nuevo Envío</button>
        }
      </div>

      <div class="list-card">
        <div class="list-header-row">
          <span>Fecha</span><span>Local</span><span>Items</span><span>Enviado por</span><span class="right">Acciones</span>
        </div>

        @if (dispatches().length === 0) {
          <div class="empty">
            <mat-icon>local_shipping</mat-icon>
            <p>Todavía no hay envíos registrados</p>
          </div>
        } @else {
          @for (d of dispatches(); track d.id) {
            <div class="list-row">
              <span class="muted">{{ d.createdAt | date:'dd MMM yyyy, HH:mm' }}</span>
              <span class="strong"><mat-icon class="loc-icon">store</mat-icon> {{ d.locationName }}</span>
              <span>
                <div class="items">
                  @for (it of d.items; track it.refId + it.type) {
                    <span class="chip" [class.chip-recipe]="it.type === 'receta'">
                      <mat-icon>{{ it.type === 'receta' ? 'restaurant' : 'egg_alt' }}</mat-icon>
                      {{ it.quantity }}{{ it.unit ? ' ' + it.unit : '' }} · {{ it.name }}
                    </span>
                  }
                </div>
                @if (d.note) { <div class="note">“{{ d.note }}”</div> }
              </span>
              <span class="user"><div class="avatar">{{ (d.dispatchedBy || '?').charAt(0).toUpperCase() }}</div> {{ d.dispatchedBy || '—' }}</span>
              <span class="right">
                @if (canCreate()) {
                  <button class="icon-btn text-red" (click)="remove(d)" title="Eliminar"><mat-icon>delete</mat-icon></button>
                }
              </span>
            </div>
          }
        }
      </div>
    </div>

    <!-- Modal Nuevo Envío -->
    @if (showForm()) {
      <div class="modal-backdrop" (click)="closeForm()">
        <div class="modal-card animate-fade-in-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><mat-icon>move_up</mat-icon> Nuevo Envío a Local</h2>
            <button class="modal-close" (click)="closeForm()"><mat-icon>close</mat-icon></button>
          </div>

          <div class="modal-body">
            <label class="field-label">Local destino</label>
            <select class="field-input" [(ngModel)]="locationId">
              <option value="" disabled>Selecciona un local</option>
              @for (l of locations(); track l.id) { <option [value]="l.id">{{ l.name }}</option> }
            </select>
            @if (locations().length === 0) {
              <p class="warn-text"><mat-icon>info</mat-icon> No hay locales registrados.</p>
            }

            <label class="field-label mt">Items a enviar</label>

            <!-- Línea para agregar item -->
            <div class="add-item">
              <select class="field-input type-sel" [(ngModel)]="draftType" (ngModelChange)="draftRefId=''">
                <option value="ingrediente">Ingrediente</option>
                <option value="receta">Receta</option>
              </select>
              <select class="field-input" [(ngModel)]="draftRefId">
                <option value="" disabled>Selecciona…</option>
                @if (draftType === 'ingrediente') {
                  @for (p of products(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
                } @else {
                  @for (r of recipes(); track r.id) { <option [value]="r.id">{{ r.name }}</option> }
                }
              </select>
              <input class="field-input qty" type="number" min="1" [(ngModel)]="draftQty" placeholder="Cant." />
              <button class="btn-add" [disabled]="!draftRefId || !(draftQty > 0)" (click)="addItem()"><mat-icon>add</mat-icon></button>
            </div>

            <!-- Items agregados -->
            @if (items().length > 0) {
              <div class="items-list">
                @for (it of items(); track it.refId + it.type; let i = $index) {
                  <div class="item-row">
                    <span class="chip" [class.chip-recipe]="it.type === 'receta'">
                      <mat-icon>{{ it.type === 'receta' ? 'restaurant' : 'egg_alt' }}</mat-icon>
                      {{ it.quantity }}{{ it.unit ? ' ' + it.unit : '' }} · {{ it.name }}
                    </span>
                    <button class="icon-btn text-red" (click)="removeItem(i)"><mat-icon>close</mat-icon></button>
                  </div>
                }
              </div>
            } @else {
              <p class="muted small">Agrega al menos un ingrediente o receta.</p>
            }

            <label class="field-label mt">Nota (opcional)</label>
            <textarea class="field-input" rows="2" [(ngModel)]="note" placeholder="Ej. Para reposición del turno de la tarde"></textarea>

            <p class="who"><mat-icon>person</mat-icon> Registrado por: <strong>{{ auth.userName() }}</strong></p>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" (click)="closeForm()">Cancelar</button>
            <button class="btn-send" [disabled]="!locationId || items().length === 0" (click)="save()">
              <mat-icon>send</mat-icon> Registrar Envío
            </button>
          </div>
        </div>
      </div>
    }

    @if (toast(); as t) {
      <div class="toast animate-fade-in-up"><mat-icon>check_circle</mat-icon><span>{{ t }}</span></div>
    }
  `,
  styles: [`
    .page-container { max-width: 1100px; margin: 0 auto; padding-bottom: 40px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-text h1 { font-family: var(--pc-font-heading); font-size: 1.8rem; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: var(--pc-yellow); }
    .header-text p { color: var(--pc-text-muted); font-size: 0.9rem; }

    .btn-primary { display: flex; align-items: center; gap: 8px; background: var(--pc-yellow); color: #1A1A2E; font-weight: 700; border: none; padding: 10px 18px; border-radius: var(--pc-radius-md); cursor: pointer; }
    .btn-primary:hover { background: #FBBF24; }

    .list-card { background: linear-gradient(135deg, rgba(22, 33, 62, 0.7), rgba(26, 26, 46, 0.5)); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg); overflow: hidden; }
    .list-header-row, .list-row { display: grid; grid-template-columns: 1.1fr 1.1fr 2.4fr 1.2fr 0.6fr; gap: 12px; padding: 14px 20px; align-items: center; }
    .list-header-row { background: rgba(0,0,0,0.2); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pc-text-muted); font-weight: 700; }
    .list-row { border-bottom: 1px solid var(--pc-border); font-size: 0.88rem; }
    .list-row:last-child { border-bottom: none; }
    .list-row:hover { background: rgba(255,255,255,0.02); }
    .right { text-align: right; }
    .muted { color: var(--pc-text-muted); }
    .small { font-size: 0.82rem; }
    .strong { display: flex; align-items: center; gap: 6px; font-weight: 600; color: var(--pc-text-primary); }
    .loc-icon { font-size: 18px; width: 18px; height: 18px; color: var(--pc-yellow); }

    .items { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { display: inline-flex; align-items: center; gap: 5px; background: rgba(96,165,250,0.12); color: #93C5FD; border: 1px solid rgba(96,165,250,0.25); padding: 3px 9px; border-radius: 12px; font-size: 0.78rem; font-weight: 600; }
    .chip-recipe { background: rgba(245,158,11,0.12); color: #FBBF24; border-color: rgba(245,158,11,0.25); }
    .chip mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .note { font-size: 0.8rem; color: var(--pc-text-muted); font-style: italic; margin-top: 5px; }

    .user { display: flex; align-items: center; gap: 8px; color: var(--pc-text-secondary); }
    .avatar { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, var(--pc-yellow), var(--pc-yellow-dark)); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; color: #1A1A2E; flex-shrink: 0; }

    .icon-btn { background: transparent; border: none; color: var(--pc-text-muted); cursor: pointer; padding: 4px; border-radius: 4px; display: inline-flex; }
    .icon-btn.text-red:hover { color: #EF4444; background: rgba(239,68,68,0.1); }

    .empty { display: flex; flex-direction: column; align-items: center; padding: 50px 20px; color: var(--pc-text-muted); gap: 8px; }
    .empty mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.3; }

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-card { background: var(--pc-bg-sidebar, #16213e); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-lg); width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid var(--pc-border); }
    .modal-header h2 { font-size: 1.15rem; display: flex; align-items: center; gap: 8px; font-family: var(--pc-font-heading); }
    .modal-close { background: none; border: none; color: var(--pc-text-muted); cursor: pointer; display: flex; }
    .modal-body { padding: 22px; display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 0.8rem; color: var(--pc-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .field-label.mt { margin-top: 14px; }
    .field-input { width: 100%; background: rgba(0,0,0,0.25); border: 1px solid var(--pc-border); border-radius: var(--pc-radius-md); color: var(--pc-text-primary); padding: 10px 12px; font-size: 0.9rem; font-family: inherit; }
    .field-input:focus { outline: none; border-color: var(--pc-border-active, #60A5FA); }
    .add-item { display: grid; grid-template-columns: 1fr 1.6fr 0.8fr auto; gap: 8px; align-items: center; }
    .add-item .qty { width: 100%; }
    .btn-add { background: rgba(96,165,250,0.15); color: #60A5FA; border: 1px solid rgba(96,165,250,0.3); border-radius: var(--pc-radius-md); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 9px; }
    .btn-add:disabled { opacity: 0.4; cursor: not-allowed; }
    .items-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
    .item-row { display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); border-radius: var(--pc-radius-md); padding: 6px 10px; }
    .warn-text, .who { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; margin-top: 8px; }
    .warn-text { color: #FBBF24; }
    .warn-text mat-icon, .who mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .who { color: var(--pc-text-muted); margin-top: 14px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 18px 22px; border-top: 1px solid var(--pc-border); }
    .btn-cancel { background: rgba(255,255,255,0.05); color: var(--pc-text-primary); border: 1px solid var(--pc-border); padding: 8px 18px; border-radius: var(--pc-radius-md); font-weight: 600; cursor: pointer; }
    .btn-send { background: var(--pc-yellow); color: #1A1A2E; border: none; padding: 8px 18px; border-radius: var(--pc-radius-md); font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #065F46; color: #ECFDF5; border: 1px solid #10B981; padding: 12px 18px; border-radius: var(--pc-radius-md); box-shadow: 0 10px 30px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 8px; font-weight: 600; z-index: 1100; }
    .toast mat-icon { color: #34D399; }

    @media (max-width: 720px) {
      .list-header-row { display: none; }
      .list-row { grid-template-columns: 1fr; gap: 6px; }
      .add-item { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class DispatchesComponent {
  dispatches = computed(() => this.dataService.dispatches());
  locations = computed(() => this.dataService.locations());
  products = computed(() => this.dataService.products());
  recipes = computed(() => this.dataService.recipes());
  canCreate = computed(() => this.auth.hasPermission('dispatch.create'));

  showForm = signal(false);
  locationId = '';
  note = '';
  items = signal<DispatchItem[]>([]);

  // Borrador del item a agregar
  draftType: DispatchItemType = 'ingrediente';
  draftRefId = '';
  draftQty = 1;

  toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private dataService: DataService, public auth: AuthService) {}

  openForm() {
    this.locationId = this.locations()[0]?.id ?? '';
    this.note = '';
    this.items.set([]);
    this.draftType = 'ingrediente';
    this.draftRefId = '';
    this.draftQty = 1;
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  addItem() {
    if (!this.draftRefId || this.draftQty <= 0) return;
    let name = '', unit: string | undefined;
    if (this.draftType === 'ingrediente') {
      const p = this.products().find(x => x.id === this.draftRefId);
      if (!p) return;
      name = p.name; unit = p.unit;
    } else {
      const r = this.recipes().find(x => x.id === this.draftRefId);
      if (!r) return;
      name = r.name;
    }
    const item: DispatchItem = { type: this.draftType, refId: this.draftRefId, name, quantity: this.draftQty, unit };
    this.items.update(list => [...list, item]);
    this.draftRefId = '';
    this.draftQty = 1;
  }

  removeItem(index: number) {
    this.items.update(list => list.filter((_, i) => i !== index));
  }

  save() {
    const loc = this.locations().find(l => l.id === this.locationId);
    if (!loc || this.items().length === 0) return;
    const user = this.auth.user();
    this.dataService.addDispatch({
      locationId: loc.id,
      locationName: loc.name,
      items: this.items(),
      dispatchedById: user?.uid,
      dispatchedBy: this.auth.userName() || 'Sistema',
      note: this.note?.trim() || undefined,
    });
    this.closeForm();
    this.showToast(`Envío registrado a ${loc.name}`);
  }

  remove(d: Dispatch) {
    if (confirm(`¿Eliminar el envío a ${d.locationName}?`)) {
      this.dataService.deleteDispatch(d.id);
    }
  }

  private showToast(message: string) {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }
}
