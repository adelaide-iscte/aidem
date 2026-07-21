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

export type LoginErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'REQUEST_TIMEOUT'
  | 'SERVER_UNAVAILABLE';

export class LoginError extends Error {
  constructor(readonly code: LoginErrorCode) {
    super(code);
    this.name = 'LoginError';
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Local:
  // private readonly backendUrl =
  //   'http://localhost:8080';

// Produção:
  private readonly backendUrl =
    'https://aidem-backend.onrender.com';

  private readonly apiUrl =
    `${this.backendUrl}/api/auth`;

  private readonly loginTimeoutMs = 90_000;

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

  warmUpBackend(): void {
    if (!this.isBrowser) {
      return;
    }

    void fetch(
      `${this.backendUrl}/api/health`
    ).catch(() => undefined);
  }

  async login(
    email: string,
    password: string
  ): Promise<LoginResponse> {
    this.clearSession();

    const controller = new AbortController();

    const timeoutId = setTimeout(
      () => controller.abort(),
      this.loginTimeoutMs
    );

    try {
      const response = await fetch(
        `${this.apiUrl}/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email.trim(),
            password
          }),
          signal: controller.signal
        }
      );

      if (response.status === 401) {
        throw new LoginError(
          'INVALID_CREDENTIALS'
        );
      }

      if (!response.ok) {
        throw new LoginError(
          'SERVER_UNAVAILABLE'
        );
      }

      const data =
        await response.json() as LoginResponse;

      this.saveSession(
        data.token,
        data.user
      );

      return data;

    } catch (error: unknown) {
      if (error instanceof LoginError) {
        throw error;
      }

      if (
        error instanceof Error &&
        error.name === 'AbortError'
      ) {
        throw new LoginError(
          'REQUEST_TIMEOUT'
        );
      }

      throw new LoginError(
        'SERVER_UNAVAILABLE'
      );

    } finally {
      clearTimeout(timeoutId);
    }
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
