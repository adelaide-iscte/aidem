import { Injectable } from '@angular/core';
import {
  AuthService
} from './auth.service';

export type ActivityType =
  | 'MOTOR'
  | 'COGNITIVE'
  | 'MIXED';

export type DifficultyLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';

export interface Exercise {
  id: number;
  title: string;
  description: string;
  domain: string;

  activityType: ActivityType;
  difficultyLevel: DifficultyLevel;

  durationMinutes: number;
  sets: number;
  repetitions: number;
  restSeconds: number;

  materials: string;
  instructions: string;
  mediaUrl: string | null;
  media2: string | null;
  instructionMedia2: string | null;
  instructionMedia3: string | null;
  instructionMedia4: string | null;
  instructionMedia5: string | null;
  instructionMedia6: string | null;
  instructionMedia7: string | null;

  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExercisePage {
  content: Exercise[];

  number: number;
  size: number;

  totalElements: number;
  totalPages: number;

  first: boolean;
  last: boolean;
  empty: boolean;
}

export type ExercisePayload = {
  title: string;
  description: string;
  domain: string;

  activityType: ActivityType;
  difficultyLevel: DifficultyLevel;

  durationMinutes: number;
  sets: number;
  repetitions: number;
  restSeconds: number;

  materials: string;
  instructions: string;

  media2: string | null;
  instructionMedia2: string | null;
  instructionMedia3: string | null;
  instructionMedia4: string | null;
  instructionMedia5: string | null;
  instructionMedia6: string | null;
  instructionMedia7: string | null;
};

@Injectable({
  providedIn: 'root'
})
export class ExerciseService {
  // Desenvolvimento local:
  // private readonly apiUrl =
  //   'http://localhost:8080/api/exercises';

  private readonly apiUrl =
    'https://aidem-backend.onrender.com/api/exercises';

  constructor(
    private authService: AuthService
  ) {}

  private getHeaders(): HeadersInit {
    const token = this.authService.getToken();

    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token
        ? {
          Authorization: `Bearer ${token}`
        }
        : {})
    };
  }

  private async handleResponse(
    response: Response
  ): Promise<string> {
    const raw = await response.text();

    if (response.status === 401) {
      this.authService.logout();

      window.dispatchEvent(
        new CustomEvent('aidem-session-expired')
      );

      throw new Error(
        'A sessão expirou. Inicie sessão novamente.'
      );
    }

    if (!response.ok) {
      throw new Error(
        raw ||
        `Erro no pedido (${response.status}).`
      );
    }

    return raw;
  }

  async getExercises(
    page = 0,
    size = 20,
    search = ''
  ): Promise<ExercisePage> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      search: search.trim()
    });

    const response = await fetch(
      `${this.apiUrl}?${params.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders()
      }
    );

    const raw = await this.handleResponse(response);

    return raw
      ? JSON.parse(raw) as ExercisePage
      : {
        content: [],
        number: 0,
        size,
        totalElements: 0,
        totalPages: 0,
        first: true,
        last: true,
        empty: true
      };
  }

  async createExercise(
    payload: ExercisePayload
  ): Promise<Exercise> {
    const response = await fetch(
      this.apiUrl,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      }
    );

    const raw = await response.text();

    if (!response.ok) {
      throw new Error(
        raw ||
        `Erro ao criar atividade (${response.status}).`
      );
    }

    return JSON.parse(raw);
  }

  async updateExercise(
    id: number,
    payload: ExercisePayload
  ): Promise<Exercise> {
    const response = await fetch(
      `${this.apiUrl}/${id}`,
      {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      }
    );

    const raw = await response.text();

    if (!response.ok) {
      throw new Error(
        raw ||
        `Erro ao editar atividade (${response.status}).`
      );
    }

    return JSON.parse(raw);
  }

  async deleteExercise(
    id: number
  ): Promise<void> {
    const response = await fetch(
      `${this.apiUrl}/${id}`,
      {
        method: 'DELETE',
        headers: this.getHeaders()
      }
    );

    if (!response.ok) {
      const raw = await response.text();

      throw new Error(
        raw ||
        `Erro ao apagar atividade (${response.status}).`
      );
    }
  }
}
