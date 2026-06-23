import { Injectable } from '@angular/core';

export type AppPatient = {
  id: number;
  name: string;
  birthDate: string | null;
  age: number;
  code: string;
  avatar: string;
  subtitle: string;
};

export type SessionHistory = {
  id: number;
  patientId: number;
  sessionDate: string;
  completedActivities: number;
  averageDifficulty: string;
};

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
  riskLevel: string;
  displayOrder: number;
  summary: boolean;
}

export interface EgpAssessment {
  assessmentId: number;
  assessmentDate: string;
  rows: EgpRow[];
}


@Injectable({
  providedIn: 'root'
})
export class PatientService {
  //private readonly apiUrl = 'http://localhost:8080/api/patients';
  private readonly apiUrl = 'https://aidem-backend.onrender.com/api/patients';

  async getPatients(): Promise<AppPatient[]> {
    const token = localStorage.getItem('aidem_token');

    if (!token) {
      throw new Error('TOKEN_MISSING');
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(this.apiUrl, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });

      const raw = await response.text();
      console.log('GET /api/patients', response.status, raw);

      if (!response.ok) {
        throw new Error(`Erro ao carregar utentes (${response.status}): ${raw}`);
      }

      return JSON.parse(raw) as AppPatient[];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // async getPatient(id:number):Promise<PatientProfile>{
  //
  //   const token = localStorage.getItem('aidem_token');
  //
  //   const response = await fetch(
  //     //`http://localhost:8080/api/patients/${id}`,
  //     `https://aidem-backend.onrender.com/api`,
  //     {
  //       headers:{
  //         Authorization:`Bearer ${token}`
  //       }
  //     }
  //   );
  //
  //   return response.json();
  // }

  async getPatient(id: number): Promise<PatientProfile> {
    const token = localStorage.getItem('aidem_token');

    if (!token) {
      throw new Error('TOKEN_MISSING');
    }

    const response = await fetch(
      `${this.apiUrl}/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      }
    );

    const raw = await response.text();

    console.log(`GET /api/patients/${id}`, response.status, raw);

    if (!response.ok) {
      throw new Error(`Erro ao carregar utente (${response.status}): ${raw}`);
    }

    return JSON.parse(raw) as PatientProfile;
  }

  async getSessionHistory(patientId: number): Promise<SessionHistory[]> {
    const token = localStorage.getItem('aidem_token');

    if (!token) {
      throw new Error('TOKEN_MISSING');
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `${this.apiUrl}/${patientId}/session-history`,
        {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
          }
        }
      );

      const raw = await response.text();

      console.log(
        `GET /api/patients/${patientId}/session-history`,
        response.status,
        raw
      );

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${raw}`);
      }

      return raw ? JSON.parse(raw) as SessionHistory[] : [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getLatestEgp(patientId: number): Promise<EgpAssessment | null> {
    const token = localStorage.getItem('aidem_token');

    if (!token) {
      throw new Error('TOKEN_MISSING');
    }

    const response = await fetch(
      `${this.apiUrl}/${patientId}/egp/latest`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      }
    );

    if (response.status === 204 || response.status === 404) {
      return null;
    }

    const raw = await response.text();

    if (!response.ok) {
      throw new Error(`Erro ao carregar EGP (${response.status}): ${raw}`);
    }

    return raw ? JSON.parse(raw) as EgpAssessment : null;
  }


}
