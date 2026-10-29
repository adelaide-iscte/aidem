import { Injectable, computed, inject, signal } from '@angular/core';

import { AuthService, AuthUser, FrontendRole } from './auth.service';

import { AppPatient, PatientProfile, PatientService } from './patient.service';

import { ExerciseNotificationService } from './exercise-notification.service';

export type CaregiverViewRole = 'informal' | 'formal';

@Injectable({
  providedIn: 'root',
})
export class AppSessionService {
  private readonly authService = inject(AuthService);

  private readonly patientService = inject(PatientService);

  private readonly notificationService = inject(ExerciseNotificationService);

  readonly currentUser = signal<AuthUser | null>(null);

  readonly role = computed<FrontendRole | null>(() => {
    const user = this.currentUser();

    return user ? this.authService.toFrontendRole(user.role) : null;
  });

  readonly isAdmin = computed(() => this.role() === 'admin');

  readonly caregiverView = computed<CaregiverViewRole>(() =>
    this.role() === 'informal' ? 'informal' : 'formal',
  );

  readonly patients = signal<AppPatient[]>([]);

  readonly isLoadingPatients = signal(false);

  readonly patientsError = signal('');

  readonly selectedPatient = signal<PatientProfile | null>(null);

  readonly isLoadingSelectedPatient = signal(false);

  readonly selectedPatientError = signal('');

  private patientsLoaded = false;

  private patientsRequest?: Promise<void>;

  private requestedPatientId: number | null = null;

  restore(): boolean {
    const token = this.authService.getToken();

    const user = this.authService.getStoredUser();

    if (!token || !user) {
      if (this.currentUser()) {
        this.clearState();
      }

      return false;
    }

    if (this.currentUser()?.id !== user.id) {
      this.clearState();
      this.currentUser.set(user);
    }

    return true;
  }

  startSession(user: AuthUser): void {
    this.clearState();
    this.currentUser.set(user);
  }

  logout(): void {
    this.authService.logout();
    this.clearState();
  }

  hasRole(roles: readonly FrontendRole[]): boolean {
    const role = this.role();

    return role !== null && roles.includes(role);
  }

  async ensurePatientsLoaded(): Promise<void> {
    if (!this.patientsLoaded) {
      await this.loadPatients();
    }
  }

  loadPatients(): Promise<void> {
    this.patientsRequest ??= this.fetchPatients().finally(() => {
      this.patientsRequest = undefined;
    });

    return this.patientsRequest;
  }

  async selectPatient(patientId: number): Promise<void> {
    if (this.selectedPatient()?.id === patientId || this.requestedPatientId === patientId) {
      return;
    }

    this.requestedPatientId = patientId;
    this.isLoadingSelectedPatient.set(true);
    this.selectedPatientError.set('');

    try {
      const patientProfile = await this.patientService.getPatient(patientId);

      if (this.requestedPatientId !== patientId) {
        return;
      }

      this.selectedPatient.set(patientProfile);

      if (this.role() === 'informal') {
        this.notificationService.start(patientProfile.id);
      } else {
        this.notificationService.stop();
      }
    } catch (error) {
      if (this.requestedPatientId !== patientId) {
        return;
      }

      console.error('Erro ao abrir utente:', error);

      this.selectedPatient.set(null);

      this.selectedPatientError.set(
        error instanceof Error ? error.message : 'Erro ao carregar perfil do utente.',
      );
    } finally {
      if (this.requestedPatientId === patientId) {
        this.requestedPatientId = null;
        this.isLoadingSelectedPatient.set(false);
      }
    }
  }

  updatePatient(updatedPatient: PatientProfile): void {
    this.selectedPatient.set(updatedPatient);

    this.patients.update((patients) =>
      patients.map((patient) =>
        patient.id === updatedPatient.id
          ? {
              ...patient,
              name: updatedPatient.name,
              birthDate: updatedPatient.birthDate,
              age: updatedPatient.age,
              avatar: updatedPatient.avatar,
              subtitle: updatedPatient.subtitle,
            }
          : patient,
      ),
    );
  }

  removePatient(patientId: number): void {
    this.patients.update((patients) => patients.filter((patient) => patient.id !== patientId));

    this.notificationService.stop();
    this.selectedPatient.set(null);
  }

  private async fetchPatients(): Promise<void> {
    this.isLoadingPatients.set(true);
    this.patientsError.set('');

    try {
      this.patients.set(await this.patientService.getPatients());

      this.patientsLoaded = true;
    } catch (error) {
      console.error('loadPatients failed', error);

      this.patients.set([]);

      this.patientsError.set(
        error instanceof Error ? error.message : 'Erro ao carregar lista de utentes.',
      );
    } finally {
      this.isLoadingPatients.set(false);
    }
  }

  private clearState(): void {
    this.notificationService.stop();

    this.currentUser.set(null);
    this.patients.set([]);
    this.selectedPatient.set(null);

    this.patientsLoaded = false;
    this.requestedPatientId = null;

    this.patientsError.set('');
    this.selectedPatientError.set('');
    this.isLoadingSelectedPatient.set(false);
  }
}
