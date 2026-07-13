import { Injectable } from '@angular/core';

export type ExerciseStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface SessionPlanExercise {
  sessionPlanExerciseId: number;
  exerciseId: number;
  orderIndex: number;
  title: string;
  description: string;
  domain: string;
  activityType: 'MOTOR' | 'COGNITIVE' | 'MIXED';
  difficultyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  durationMinutes: number;
  sets: number | null;
  repetitions: number | null;
  restSeconds: number | null;
  materials: string | null;
  instructions: string | null;
  mediaUrl: string | null;
  reason: string | null;
  status: ExerciseStatus;
}

export interface SessionPlan {
  id: number;
  patientId: number;
  assessmentId: number | null;
  sessionDate: string;
  targetDurationMinutes: number;
  totalDurationMinutes: number;
  status: string;
  exercises: SessionPlanExercise[];
}

export interface ExerciseFeedbackPayload {
  completed: boolean;
  difficultyFeedback: 'easy' | 'medium' | 'hard' | 'too_hard';
  emotionFeedback?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class SessionPlanService {
  // private readonly apiBase = 'http://localhost:8080/api';
  private readonly apiBase = 'https://aidem-backend.onrender.com/api';

  async getTodayPlan(patientId: number): Promise<SessionPlan> {
    return this.request<SessionPlan>(`${this.apiBase}/patients/${patientId}/session-plans/today`);
  }

  async regenerateTodayPlan(patientId: number): Promise<SessionPlan> {
    return this.request<SessionPlan>(`${this.apiBase}/patients/${patientId}/session-plans/today/regenerate`, {
      method: 'POST'
    });
  }

  async sendFeedback(
    sessionPlanExerciseId: number,
    payload: ExerciseFeedbackPayload
  ): Promise<SessionPlanExercise> {
    return this.request<SessionPlanExercise>(`${this.apiBase}/session-plan-exercises/${sessionPlanExerciseId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async skipExercise(sessionPlanExerciseId: number, notes: string): Promise<SessionPlanExercise> {
    return this.request<SessionPlanExercise>(`${this.apiBase}/session-plan-exercises/${sessionPlanExerciseId}/skip`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  }

  async resetExercise(sessionPlanExerciseId: number): Promise<SessionPlanExercise> {
    return this.request<SessionPlanExercise>(`${this.apiBase}/session-plan-exercises/${sessionPlanExerciseId}/reset`, {
      method: 'PATCH'
    });
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('aidem_token');

    if (!token) {
      throw new Error('TOKEN_MISSING');
    }

    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init.headers ?? {})
      }
    });

    const raw = await response.text();
    console.log(url, response.status, raw);

    if (!response.ok) {
      throw new Error(raw || `Erro ${response.status}`);
    }

    return raw ? JSON.parse(raw) as T : ({} as T);
  }
}
