import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Account, Transaction, AccountingSummary } from '../models';

/**
 * AccountingService — Módulo de contabilidad (estilo QuickBooks), solo para admins.
 * Consume los endpoints protegidos `/api/accounting/*` (el token JWT lo adjunta el interceptor).
 */
@Injectable({ providedIn: 'root' })
export class AccountingService {
  private http = inject(HttpClient);
  private readonly api = 'http://localhost:3000/api/accounting';

  private _accounts = signal<Account[]>([]);
  private _transactions = signal<Transaction[]>([]);
  private _summary = signal<AccountingSummary | null>(null);
  private _loading = signal(false);

  readonly accounts = this._accounts.asReadonly();
  readonly transactions = this._transactions.asReadonly();
  readonly summary = this._summary.asReadonly();
  readonly loading = this._loading.asReadonly();

  constructor() {
    this.loadAll();
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
    try { this._transactions.set(await firstValueFrom(this.http.get<Transaction[]>(`${this.api}/transactions`))); }
    catch (e) { console.error('transactions', e); }
  }

  async reloadSummary() {
    try { this._summary.set(await firstValueFrom(this.http.get<AccountingSummary>(`${this.api}/transactions/summary`))); }
    catch (e) { console.error('summary', e); }
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
