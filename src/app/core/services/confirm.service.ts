import { Injectable, signal } from '@angular/core';

export interface ConfirmState {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
}

/**
 * Diálogo de confirmación in-app (reemplaza el `confirm()` nativo del navegador).
 * Uso: `if (await this.confirm.ask('¿Eliminar?', { confirmText: 'Eliminar' })) { ... }`.
 * El diálogo se renderiza una sola vez en el layout.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly state = signal<ConfirmState | null>(null);
  private resolver: ((value: boolean) => void) | null = null;

  ask(message: string, options?: Partial<Omit<ConfirmState, 'message'>>): Promise<boolean> {
    this.state.set({
      message,
      title: options?.title ?? 'Confirmar acción',
      confirmText: options?.confirmText ?? 'Confirmar',
      cancelText: options?.cancelText ?? 'Cancelar',
      danger: options?.danger ?? true,
    });
    return new Promise<boolean>(resolve => { this.resolver = resolve; });
  }

  resolve(value: boolean) {
    this.state.set(null);
    const r = this.resolver;
    this.resolver = null;
    r?.(value);
  }
}
