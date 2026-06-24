import { Injectable } from '@angular/core';

export type BackendRole = 'ADMIN' | 'FORMAL_CAREGIVER' | 'INFORMAL_CAREGIVER';
export type FrontendRole = 'formal' | 'informal';

export type AuthUser = {
  id: number;
  email: string;
  fullName: string;
  role: BackendRole;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  //private readonly apiUrl = 'http://localhost:8080/api/auth';
  private readonly apiUrl = 'https://aidem-backend.onrender.com/api/auth';
  async login(email: string, password: string): Promise<LoginResponse> {
    localStorage.removeItem('aidem_token');
    localStorage.removeItem('aidem_user');

    const response = await fetch(`${this.apiUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password })
    });

    if (!response.ok) {
      throw new Error('LOGIN_FAILED');
    }

    const data = await response.json() as LoginResponse;

    localStorage.setItem('aidem_token', data.token);
    localStorage.setItem('aidem_user', JSON.stringify(data.user));

    return data;
  }

  toFrontendRole(role: BackendRole): FrontendRole {
    return role === 'FORMAL_CAREGIVER' || role === 'ADMIN'
      ? 'formal'
      : 'informal';
  }
}
