import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, FrontendRole } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  @Output() loginSuccess = new EventEmitter<FrontendRole>();

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
      this.loginSuccess.emit(this.authService.toFrontendRole(response.user.role));
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
