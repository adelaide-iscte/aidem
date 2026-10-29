import { Injectable, inject } from '@angular/core';

import { Location } from '@angular/common';

import { Router } from '@angular/router';

import { AppSessionService } from './app-session.service';

type NavigationState = {
  depth?: number;
};

@Injectable({
  providedIn: 'root',
})
export class AppNavigationService {
  private readonly router = inject(Router);

  private readonly location = inject(Location);

  private readonly session = inject(AppSessionService);

  homeUrl(): string {
    const patient = this.session.selectedPatient();

    return patient ? `/utentes/${patient.id}` : '/';
  }

  goHome(): void {
    void this.go(this.homeUrl());
  }

  goToPatients(): void {
    if (!this.session.hasRole(['admin', 'formal'])) {
      return;
    }

    void this.go('/utentes');
  }

  openPatient(patientId: number): void {
    void this.go(`/utentes/${patientId}`);
  }

  openCreatePatient(): void {
    void this.go('/utentes/novo');
  }

  goToActivities(): void {
    this.goToPatientPage('atividades');
  }

  goToProfile(): void {
    this.goToPatientPage('perfil');
  }

  goToChat(): void {
    void this.go('/mensagens');
  }

  goToContents(): void {
    void this.go('/conteudos');
  }

  openAdminActivities(): void {
    void this.go('/admin/exercicios');
  }

  openCreateExercise(): void {
    void this.go('/admin/exercicios/novo');
  }

  openEditExercise(exerciseId: number): void {
    void this.go(`/admin/exercicios/${exerciseId}/editar`);
  }

  openUserManagement(): void {
    void this.go('/admin/utilizadores');
  }

  back(fallbackUrl: string = this.homeUrl()): void {
    if (this.currentDepth() > 0) {
      this.location.back();
      return;
    }

    void this.router.navigateByUrl(fallbackUrl, { replaceUrl: true });
  }

  enterApp(url: string = '/'): void {
    void this.go(url, true);
  }

  logout(): void {
    this.session.logout();

    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private goToPatientPage(page: 'atividades' | 'perfil'): void {
    const patient = this.session.selectedPatient();

    if (!patient) {
      return;
    }

    void this.go(`/utentes/${patient.id}/${page}`);
  }

  private go(url: string, replaceUrl = false): Promise<boolean> {
    const depth = this.currentDepth();

    return this.router.navigateByUrl(url, {
      replaceUrl,
      state: {
        depth: replaceUrl ? depth : depth + 1,
      },
    });
  }

  private currentDepth(): number {
    const state = this.location.getState() as NavigationState | null;

    return typeof state?.depth === 'number' ? state.depth : 0;
  }
}
