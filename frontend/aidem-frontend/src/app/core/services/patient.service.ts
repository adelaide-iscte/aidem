import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

export type SessionHistoryExercise = {
  sessionPlanExerciseId: number;
  exerciseId: number;
  orderIndex: number;
  title: string;
  domain: string;
  activityType: string;
  difficultyLevel: string;
  durationMinutes: number | null;

  status:
    | 'PENDING'
    | 'COMPLETED'
    | 'FAILED'
    | 'SKIPPED';

  recommendationReason: string | null;
  completed: boolean | null;
  difficultyFeedback: string | null;
  emotionFeedback: string | null;
  caregiverReason: string | null;
};

export interface UpdatePatientRequest {
  fullName: string;
  birthDate: string;
  gender: string;
  diagnosisType: string;

  phone: string;
  email: string;
  address: string;

  education: string;
  profession: string;
  sessionType: string;

  informalCaregiverName: string;
  informalCaregiverPhone: string;
  informalCaregiverEmail: string;

  avatar: string | null;
}

export type SessionHistory = {
  id: number;
  patientId: number;
  sessionDate: string;
  status: string;
  completedActivities: number;
  totalActivities: number;
  averageDifficulty: string;
  exercises: SessionHistoryExercise[];
};

export type AppPatient = {
  id: number;
  name: string;
  birthDate: string | null;
  age: number;
  code: string;
  avatar: string;
  subtitle: string;
};

export interface CreatePatientRequest {
  fullName: string;
  birthDate: string;
  gender: string;
  diagnosisType: string;
  phone: string;
  email: string;
  address: string;
  education: string;
  profession: string;
  sessionType: string;
  informalCaregiverName: string;
  informalCaregiverPhone: string;
  informalCaregiverEmail: string;
  notes: string;
  assessmentDate: string;
  egpScores: {
    domain: string;
    score: number;
    normalizedScore: number;
    riskLevel: string | null;
    displayOrder: number;
  }[];

  avatar: string | null;
}

export interface PatientProfile {
  id: number;

  name: string;
  fullName: string;
  birthDate: string | null;
  age: number;
  code: string;

  diagnosisType: string;
  gender: string;

  phone: string;
  email: string;
  address: string;

  education: string;
  profession: string;
  sessionType: string;

  informalCaregiverName: string;
  informalCaregiverPhone: string;
  informalCaregiverEmail: string;

  avatar: string;
  subtitle: string;
}

export interface EgpRow {
  label: string;
  pd: number;
  nr: number;
  riskLevel: string | null;
  displayOrder: number;
  summary: boolean;
}

export interface EgpAssessment {
  assessmentId: number;
  assessmentDate: string;
  rows: EgpRow[];
}

export interface UpdateEgpRequest {
  assessmentId: number;
  assessmentDate: string;

  rows: {
    label: string;
    pd: number;
    nr: number;
    riskLevel: string | null;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  // private readonly apiUrl =
  //   'http://localhost:8080/api/patients';

  // Produção:
  private readonly apiUrl =
    'https://aidem-backend.onrender.com/api/patients';

  constructor(
    private authService: AuthService
  ) {}

  private getHeaders(
    includeContentType = false
  ): HeadersInit {
    const token =
      this.authService.getToken();

    if (!token) {
      throw new Error('TOKEN_MISSING');
    }

    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(includeContentType
        ? {
          'Content-Type':
            'application/json'
        }
        : {})
    };
  }

  private async handleResponse(
    response: Response,
    defaultError: string
  ): Promise<string> {
    const raw = await response.text();

    if (response.status === 401) {
      this.authService.expireSession();

      throw new Error(
        'A sessão expirou. Inicie sessão novamente.'
      );
    }

    if (!response.ok) {
      throw new Error(
        raw ||
        `${defaultError} (${response.status}).`
      );
    }

    return raw;
  }

  async getPatients(): Promise<AppPatient[]> {
    const controller =
      new AbortController();

    const timeoutId = setTimeout(
      () => controller.abort(),
      10000
    );

    try {
      const response = await fetch(
        this.apiUrl,
        {
          signal: controller.signal,
          headers: this.getHeaders()
        }
      );

      const raw =
        await this.handleResponse(
          response,
          'Erro ao carregar utentes'
        );

      console.log(
        'GET /api/patients',
        response.status,
        raw
      );

      return raw
        ? JSON.parse(raw) as AppPatient[]
        : [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getPatient(
    id: number
  ): Promise<PatientProfile> {
    const response = await fetch(
      `${this.apiUrl}/${id}`,
      {
        headers: this.getHeaders()
      }
    );

    const raw =
      await this.handleResponse(
        response,
        'Erro ao carregar utente'
      );

    console.log(
      `GET /api/patients/${id}`,
      response.status,
      raw
    );

    return JSON.parse(raw) as PatientProfile;
  }

  async getSessionHistory(
    patientId: number
  ): Promise<SessionHistory[]> {
    const controller =
      new AbortController();

    const timeoutId = setTimeout(
      () => controller.abort(),
      10000
    );

    try {
      const response = await fetch(
        `${this.apiUrl}/${patientId}/session-history`,
        {
          signal: controller.signal,
          headers: this.getHeaders()
        }
      );

      const raw =
        await this.handleResponse(
          response,
          'Erro ao carregar histórico de sessões'
        );

      console.log(
        `GET /api/patients/${patientId}/session-history`,
        response.status,
        raw
      );

      return raw
        ? JSON.parse(raw) as SessionHistory[]
        : [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getLatestEgp(
    patientId: number
  ): Promise<EgpAssessment | null> {
    const response = await fetch(
      `${this.apiUrl}/${patientId}/egp/latest`,
      {
        headers: this.getHeaders()
      }
    );

    if (
      response.status === 204 ||
      response.status === 404
    ) {
      return null;
    }

    const raw =
      await this.handleResponse(
        response,
        'Erro ao carregar EGP'
      );

    return raw
      ? JSON.parse(raw) as EgpAssessment
      : null;
  }

  async updateLatestEgp(
    patientId: number,
    payload: UpdateEgpRequest
  ): Promise<EgpAssessment> {

    const response = await fetch(
      `${this.apiUrl}/${patientId}/egp/latest`,
      {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(payload)
      }
    );

    const raw =
      await this.handleResponse(
        response,
        'Erro ao atualizar dados EGP'
      );

    return JSON.parse(raw) as EgpAssessment;
  }

  async createPatient(
    payload: CreatePatientRequest
  ): Promise<PatientProfile> {
    const response = await fetch(
      this.apiUrl,
      {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(payload)
      }
    );

    const raw =
      await this.handleResponse(
        response,
        'Erro ao criar utente'
      );

    console.log(
      'POST /api/patients',
      response.status,
      raw
    );

    return JSON.parse(raw) as PatientProfile;
  }

  async updatePatient(
    id: number,
    payload: UpdatePatientRequest
  ): Promise<PatientProfile> {

    const response = await fetch(
      `${this.apiUrl}/${id}`,
      {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(payload)
      }
    );

    const raw =
      await this.handleResponse(
        response,
        'Erro ao atualizar utente'
      );

    return JSON.parse(raw) as PatientProfile;
  }

  async deletePatient(
    id: number
  ): Promise<void> {
    const response = await fetch(
      `${this.apiUrl}/${id}`,
      {
        method: 'DELETE',
        headers: this.getHeaders()
      }
    );

    await this.handleResponse(
      response,
      'Erro ao remover utente'
    );
  }

}
