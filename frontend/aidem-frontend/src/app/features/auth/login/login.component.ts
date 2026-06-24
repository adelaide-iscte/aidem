import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AuthService,
  AuthUser,
  FrontendRole
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
  errorMessage = '';
  isLoading = false;

  constructor(private authService: AuthService) {}

  async login(): Promise<void> {
    this.errorMessage = '';

    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'Palavra-passe errada.';
      return;
    }

    this.isLoading = true;

    try {
      const response = await this.authService.login(this.email, this.password);

      this.loginSuccess.emit({
        role: this.authService.toFrontendRole(response.user.role),
        user: response.user
      });
    } catch {
      this.errorMessage = 'Palavra-passe errada.';
    } finally {
      this.isLoading = false;
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
