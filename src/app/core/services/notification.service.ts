import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface AppToast {
  id: number;
  type: ToastType;
  message: string;
}

/**
 * Notificaciones globales (toasts). Reemplaza los `alert()` y los `console.error`
 * silenciosos: cada operación que falla o se completa puede avisar al usuario.
 * El contenedor se renderiza una sola vez en el layout.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _toasts = signal<AppToast[]>([]);
  readonly toasts = this._toasts.asReadonly();
  private seq = 0;

  success(message: string) { this.push('success', message); }
  error(message: string) { this.push('error', message); }
  info(message: string) { this.push('info', message); }

  dismiss(id: number) {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }

  private push(type: ToastType, message: string) {
    const id = ++this.seq;
    this._toasts.update(list => [...list, { id, type, message }]);
    setTimeout(() => this.dismiss(id), type === 'error' ? 6000 : 4000);
  }
}
