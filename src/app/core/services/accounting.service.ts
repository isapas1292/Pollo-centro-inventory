import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Account, Transaction, AccountingSummary } from '../models';
import { DataService } from './data.service';

/**
 * AccountingService — Módulo de contabilidad (estilo QuickBooks), solo para admins.
 * Consume los endpoints protegidos `/api/accounting/*` (el token JWT lo adjunta el interceptor).
 */
@Injectable({ providedIn: 'root' })
export class AccountingService {
  private http = inject(HttpClient);
  private dataService = inject(DataService);
  private readonly api = 'http://localhost:3000/api/accounting';

  private _accounts = signal<Account[]>([]);
  private _transactions = signal<Transaction[]>([]);
  private _summary = signal<AccountingSummary | null>(null);
  private _loading = signal(false);
  private _selectedLocal = signal<string>('all');

  readonly accounts = this._accounts.asReadonly();
  readonly transactions = this._transactions.asReadonly();
  readonly summary = this._summary.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly selectedLocal = this._selectedLocal.asReadonly();
  readonly locations = this.dataService.locations;

  constructor() {
    this.loadAll();
  }

  /** Cambia el local activo y recarga transacciones y resumen filtrados. */
  async setLocal(localId: string) {
    this._selectedLocal.set(localId);
    await Promise.all([this.reloadTransactions(), this.reloadSummary()]);
  }

  private localQuery(): string {
    const l = this._selectedLocal();
    return l && l !== 'all' ? `?local=${encodeURIComponent(l)}` : '';
  }

  async loadAll() {
    this._loading.set(true);
    await Promise.all([this.reloadAccounts(), this.reloadTransactions(), this.reloadSummary()]);
    this._loading.set(false);
  }

  async reloadAccounts() {
    try { this._accounts.set(await firstValueFrom(this.http.get<Account[]>(`${this.api}/accounts`))); }
    catch (e) { console.error('accounts', e); }
  }

  async reloadTransactions() {
    try { this._transactions.set(await firstValueFrom(this.http.get<Transaction[]>(`${this.api}/transactions${this.localQuery()}`))); }
    catch (e) { console.error('transactions', e); }
  }

  async reloadSummary() {
    try { this._summary.set(await firstValueFrom(this.http.get<AccountingSummary>(`${this.api}/transactions/summary${this.localQuery()}`))); }
    catch (e) { console.error('summary', e); }
  }

  /** Descarga el Estado de Resultados + transacciones del local activo como Excel (.xlsx). */
  async exportExcel() {
    const local = this._selectedLocal();
    try {
      const blob = await firstValueFrom(
        this.http.get(`${this.api}/transactions/export${this.localQuery()}`, { responseType: 'blob' })
      );
      const name = `Contabilidad_${local === 'all' ? 'todos' : local}_${new Date().toISOString().substring(0, 10)}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error('exportExcel', e); }
  }

  // --- Transactions ---
  async addTransaction(input: Partial<Transaction>) {
    try {
      await firstValueFrom(this.http.post(`${this.api}/transactions`, input));
      await Promise.all([this.reloadTransactions(), this.reloadSummary()]);
    } catch (e) { console.error('addTransaction', e); }
  }

  async updateTransaction(id: string, input: Partial<Transaction>) {
    try {
      await firstValueFrom(this.http.put(`${this.api}/transactions/${id}`, input));
      await Promise.all([this.reloadTransactions(), this.reloadSummary()]);
    } catch (e) { console.error('updateTransaction', e); }
  }

  async deleteTransaction(id: string) {
    try {
      await firstValueFrom(this.http.delete(`${this.api}/transactions/${id}`));
      await Promise.all([this.reloadTransactions(), this.reloadSummary()]);
    } catch (e) { console.error('deleteTransaction', e); }
  }

  // --- Accounts ---
  async addAccount(input: Partial<Account>) {
    try {
      await firstValueFrom(this.http.post(`${this.api}/accounts`, input));
      await this.reloadAccounts();
    } catch (e) { console.error('addAccount', e); }
  }

  async updateAccount(id: string, input: Partial<Account>) {
    try {
      await firstValueFrom(this.http.put(`${this.api}/accounts/${id}`, input));
      await this.reloadAccounts();
    } catch (e) { console.error('updateAccount', e); }
  }

  async deleteAccount(id: string) {
    try {
      await firstValueFrom(this.http.delete(`${this.api}/accounts/${id}`));
      await this.reloadAccounts();
    } catch (e) { console.error('deleteAccount', e); }
  }
}
