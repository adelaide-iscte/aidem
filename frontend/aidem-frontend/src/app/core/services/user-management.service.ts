import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

export type CaregiverRole =
  | 'FORMAL_CAREGIVER'
  | 'INFORMAL_CAREGIVER';

export type CaregiverPatient = {
  id: number;
  name: string;
  code: string;
};

export type CaregiverUser = {
  id: number;
  fullName: string;
  email: string;
  role: CaregiverRole;
  patients: CaregiverPatient[];
};

export type SaveCaregiverUserPayload = {
  fullName: string;
  email: string;
  password: string;
  role: CaregiverRole;
  patientIds: number[];
};

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {

  // Local:
  // private readonly apiUrl =
  //   'http://localhost:8080/api/admin/users';

  // Produção:
  private readonly apiUrl =
    'https://aidem-backend.onrender.com/api/admin/users';

  constructor(
    private authService: AuthService
  ) {}

  private getHeaders(): HeadersInit {
    const token =
      this.authService.getToken();

    if (!token) {
      throw new Error('TOKEN_MISSING');
    }

    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
  }

  private async handleResponse<T>(
    response: Response,
    defaultError: string
  ): Promise<T> {
    const raw =
      await response.text();

    if (response.status === 401) {
      this.authService.expireSession();

      throw new Error(
        'A sessão expirou. Inicie sessão novamente.'
      );
    }

    if (!response.ok) {
      throw new Error(
        this.readErrorMessage(raw) ||
        `${defaultError} (${response.status}).`
      );
    }

    return raw
      ? JSON.parse(raw) as T
      : {} as T;
  }

  private readErrorMessage(
    raw: string
  ): string {
    if (!raw) {
      return '';
    }

    try {
      const body =
        JSON.parse(raw) as {
          detail?: string;
          message?: string;
        };

      return (
        body.detail ||
        body.message ||
        raw
      );
    } catch {
      return raw;
    }
  }

  async getCaregivers():
    Promise<CaregiverUser[]> {

    const response =
      await fetch(
        this.apiUrl,
        {
          headers: this.getHeaders()
        }
      );

    return this.handleResponse<
      CaregiverUser[]
    >(
      response,
      'Erro ao carregar utilizadores'
    );
  }

  async createCaregiver(
    payload: SaveCaregiverUserPayload
  ): Promise<CaregiverUser> {

    const response =
      await fetch(
        this.apiUrl,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        }
      );

    return this.handleResponse<
      CaregiverUser
    >(
      response,
      'Erro ao criar utilizador'
    );
  }

  async updateCaregiver(
    id: number,
    payload: SaveCaregiverUserPayload
  ): Promise<CaregiverUser> {

    const response =
      await fetch(
        `${this.apiUrl}/${id}`,
        {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        }
      );

    return this.handleResponse<
      CaregiverUser
    >(
      response,
      'Erro ao atualizar utilizador'
    );
  }

  async deleteCaregiver(
    id: number
  ): Promise<void> {

    const response =
      await fetch(
        `${this.apiUrl}/${id}`,
        {
          method: 'DELETE',
          headers: this.getHeaders()
        }
      );

    await this.handleResponse<void>(
      response,
      'Erro ao apagar utilizador'
    );
  }
}
