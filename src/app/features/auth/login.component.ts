import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-container">
      <div class="login-bg">
        <div class="bg-shape bg-shape-1"></div>
        <div class="bg-shape bg-shape-2"></div>
        <div class="bg-shape bg-shape-3"></div>
      </div>

      <div class="login-card animate-fade-in-up">
        <div class="login-header">
          <div class="logo-container">
            <div class="logo-icon">🐔</div>
          </div>
          <h1 class="brand-name">
            <span class="brand-pollo">Pollo</span>
            <span class="brand-centro">CENTRO</span>
          </h1>
          <p class="brand-subtitle">Sistema de Inventario</p>
        </div>

        <form class="login-form" (ngSubmit)="onLogin()">
          <mat-form-field appearance="outline" class="login-field">
            <mat-label>Correo electrónico</mat-label>
            <input matInput
                   type="email"
                   [(ngModel)]="email"
                   name="email"
                   id="login-email"
                   required
                   autocomplete="email" />
            <mat-icon matPrefix>email</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="login-field">
            <mat-label>Contraseña</mat-label>
            <input matInput
                   [type]="showPassword() ? 'text' : 'password'"
                   [(ngModel)]="password"
                   name="password"
                   id="login-password"
                   required
                   autocomplete="current-password" />
            <mat-icon matPrefix>lock</mat-icon>
            <button mat-icon-button matSuffix type="button" (click)="showPassword.set(!showPassword())">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          @if (error()) {
            <div class="login-error animate-fade-in">
              <mat-icon>error_outline</mat-icon>
              <span>{{ error() }}</span>
            </div>
          }

          <button mat-flat-button
                  class="login-btn"
                  type="submit"
                  id="login-submit"
                  [disabled]="loading()">
            @if (loading()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              Iniciar Sesión
            }
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      position: relative;
      overflow: hidden;
      background: var(--pc-bg-primary);
    }

    .login-bg {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }

    .bg-shape {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.15;
    }

    .bg-shape-1 {
      width: 500px;
      height: 500px;
      background: var(--pc-yellow);
      top: -100px;
      right: -100px;
      animation: float 8s ease-in-out infinite;
    }

    .bg-shape-2 {
      width: 400px;
      height: 400px;
      background: var(--pc-red);
      bottom: -80px;
      left: -80px;
      animation: float 10s ease-in-out infinite reverse;
    }

    .bg-shape-3 {
      width: 300px;
      height: 300px;
      background: var(--pc-yellow-dark);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: float 12s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translate(0, 0); }
      33% { transform: translate(30px, -20px); }
      66% { transform: translate(-20px, 20px); }
    }

    .login-card {
      position: relative;
      z-index: 1;
      background: linear-gradient(135deg, rgba(22, 33, 62, 0.9), rgba(15, 15, 26, 0.95));
      backdrop-filter: blur(40px);
      border: 1px solid var(--pc-border);
      border-radius: var(--pc-radius-xl);
      padding: 48px 40px;
      width: 100%;
      max-width: 420px;
      box-shadow: var(--pc-shadow-lg);
    }

    .login-header {
      text-align: center;
      margin-bottom: 36px;
    }

    .logo-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, var(--pc-yellow), var(--pc-yellow-dark));
      border-radius: 50%;
      margin-bottom: 16px;
      box-shadow: 0 4px 24px rgba(242, 201, 76, 0.3);
    }

    .logo-icon {
      font-size: 40px;
      line-height: 1;
    }

    .brand-name {
      font-family: var(--pc-font-heading);
      font-size: 2.2rem;
      font-weight: 800;
      margin-bottom: 4px;
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 8px;
    }

    .brand-pollo {
      color: var(--pc-yellow);
    }

    .brand-centro {
      color: var(--pc-red);
      letter-spacing: 0.05em;
    }

    .brand-subtitle {
      color: var(--pc-text-muted);
      font-size: 0.9rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .login-field {
      width: 100%;
    }

    .login-error {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(229, 57, 53, 0.1);
      border: 1px solid rgba(229, 57, 53, 0.2);
      border-radius: var(--pc-radius-sm);
      padding: 10px 16px;
      color: var(--pc-red-light);
      font-size: 0.85rem;
    }

    .login-error mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .login-btn {
      margin-top: 8px;
      height: 48px;
      font-size: 1rem;
      font-weight: 600;
      font-family: var(--pc-font-heading);
      letter-spacing: 0.03em;
      border-radius: var(--pc-radius-md) !important;
      background: linear-gradient(135deg, var(--pc-yellow), var(--pc-yellow-dark)) !important;
      color: #1A1A2E !important;
      transition: all var(--pc-transition-normal);
    }

    .login-btn:hover:not([disabled]) {
      box-shadow: 0 4px 24px rgba(242, 201, 76, 0.4);
      transform: translateY(-1px);
    }

    .login-btn:disabled {
      opacity: 0.7;
    }

    .login-footer {
      margin-top: 24px;
      text-align: center;
    }

    .demo-hint {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      color: var(--pc-text-muted);
      background: rgba(255, 255, 255, 0.03);
      padding: 8px 16px;
      border-radius: var(--pc-radius-sm);
      border: 1px solid var(--pc-border);
    }

    .demo-hint mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--pc-yellow);
    }

    @media (max-width: 480px) {
      .login-card {
        margin: 16px;
        padding: 32px 24px;
      }

      .brand-name {
        font-size: 1.8rem;
      }
    }
  `],
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = signal(false);
  loading = signal(false);
  error = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate([this.authService.homeRoute()]);
    }
  }

  async onLogin(): Promise<void> {
    if (!this.email || !this.password) {
      this.error.set('Por favor completa todos los campos');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const success = await this.authService.login(this.email, this.password);
      if (success) {
        this.router.navigate([this.authService.homeRoute()]);
      } else {
        this.error.set('Credenciales incorrectas');
      }
    } catch (e) {
      this.error.set('Error al iniciar sesión');
    } finally {
      this.loading.set(false);
    }
  }
}
