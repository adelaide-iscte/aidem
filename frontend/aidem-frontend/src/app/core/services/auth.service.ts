import {
  Inject,
  Injectable,
  PLATFORM_ID
} from '@angular/core';

import {
  isPlatformBrowser
} from '@angular/common';

import {
  Subject
} from 'rxjs';

export type BackendRole =
  | 'ADMIN'
  | 'FORMAL_CAREGIVER'
  | 'INFORMAL_CAREGIVER';

export type FrontendRole =
  | 'admin'
  | 'formal'
  | 'informal';

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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // private readonly apiUrl =
  //   'http://localhost:8080/api/auth';

  // Produção:
  private readonly apiUrl =
    'https://aidem-backend.onrender.com/api/auth';

  private readonly tokenKey =
    'aidem_token';

  private readonly userKey =
    'aidem_user';

  private readonly sessionExpiredSubject =
    new Subject<void>();

  readonly sessionExpired$ =
    this.sessionExpiredSubject.asObservable();

  constructor(
    @Inject(PLATFORM_ID)
    private platformId: object
  ) {}

  private get isBrowser(): boolean {
    return isPlatformBrowser(
      this.platformId
    );
  }

  async login(
    email: string,
    password: string
  ): Promise<LoginResponse> {
    /*
     * Limpa qualquer sessão anterior antes
     * de guardar o novo utilizador.
     */
    this.clearSession();

    const response = await fetch(
      `${this.apiUrl}/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      }
    );

    if (!response.ok) {
      throw new Error('LOGIN_FAILED');
    }

    const data = await response.json() as LoginResponse;

    this.saveSession(
      data.token,
      data.user
    );

    return data;
  }

  toFrontendRole(
    role: BackendRole
  ): FrontendRole {
    switch (role) {
      case 'ADMIN':
        return 'admin';

      case 'FORMAL_CAREGIVER':
        return 'formal';

      case 'INFORMAL_CAREGIVER':
        return 'informal';
    }
  }

  saveSession(
    token: string,
    user: AuthUser
  ): void {
    if (!this.isBrowser) {
      return;
    }

    localStorage.setItem(
      this.tokenKey,
      token
    );

    localStorage.setItem(
      this.userKey,
      JSON.stringify(user)
    );
  }

  clearSession(): void {
    if (!this.isBrowser) {
      return;
    }

    localStorage.removeItem(
      this.tokenKey
    );

    localStorage.removeItem(
      this.userKey
    );
  }

  logout(): void {
    this.clearSession();
  }

  expireSession(): void {
    this.clearSession();

    this.sessionExpiredSubject.next();
  }

  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }

    return localStorage.getItem(
      this.tokenKey
    );
  }

  getStoredUser(): AuthUser | null {
    if (!this.isBrowser) {
      return null;
    }

    const rawUser =
      localStorage.getItem(
        this.userKey
      );

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(
        rawUser
      ) as AuthUser;
    } catch {
      this.clearSession();
      return null;
    }
  }

  hasSession(): boolean {
    return Boolean(
      this.getToken() &&
      this.getStoredUser()
    );
  }
}
