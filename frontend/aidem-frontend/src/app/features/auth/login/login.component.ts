import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AuthService,
  AuthUser,
  FrontendRole,
  LoginError
} from '../../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../../shared/laoding-spinner-modal/loading-spinner.component';

export type LoginSuccessEvent = {
  role: FrontendRole;
  user: AuthUser;
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  @Output() loginSuccess = new EventEmitter<LoginSuccessEvent>();

  email = '';
  password = '';
  showPassword = false;
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);

  constructor(private authService: AuthService) {
    this.authService.warmUpBackend();
  }

  async login(): Promise<void> {
    if (this.isLoading()) {
      return;
    }

    this.errorMessage.set('');

    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage.set(
        'Preencha o email e a palavra-passe.'
      );
      return;
    }

    this.isLoading.set(true);

    try {
      const response =
        await this.authService.login(
          this.email,
          this.password
        );

      this.loginSuccess.emit({
        role: this.authService.toFrontendRole(
          response.user.role
        ),
        user: response.user
      });

    } catch (error: unknown) {
      this.errorMessage.set(
        this.getLoginErrorMessage(error)
      );

    } finally {
      this.isLoading.set(false);
    }
  }

  private getLoginErrorMessage(
    error: unknown
  ): string {
    if (!(error instanceof LoginError)) {
      return 'Não foi possível iniciar sessão. Tente novamente.';
    }

    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 'Email ou palavra-passe incorretos.';

      case 'REQUEST_TIMEOUT':
        return 'O servidor está a demorar demasiado a responder. Tente novamente dentro de instantes.';

      case 'SERVER_UNAVAILABLE':
        return 'Não foi possível ligar ao servidor. Verifique a ligação e tente novamente.';
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
