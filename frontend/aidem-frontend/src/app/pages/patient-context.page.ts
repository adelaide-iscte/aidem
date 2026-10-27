import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoadingSpinnerComponent } from '../shared/laoding-spinner-modal/loading-spinner.component';
import { AppSessionService } from '../core/services/app-session.service';

/*
 * Rota pai de /utentes/:patientId.
 *
 * Carrega o utente indicado no URL (também
 * ao fazer refresh ou ao navegar com os
 * botões do browser) e só depois mostra as
 * páginas filhas (início, atividades, perfil).
 */
@Component({
  selector: 'app-patient-context-page',
  standalone: true,
  imports: [RouterOutlet, LoadingSpinnerComponent],
  template: `
    @if (session.isLoadingSelectedPatient()) {
      <app-loading-spinner message="A carregar perfil do utente..."></app-loading-spinner>
    } @else if (session.selectedPatientError()) {
      <p>{{ session.selectedPatientError() }}</p>
    } @else if (session.selectedPatient()?.id === patientId()) {
      <router-outlet />
    }
  `
})
export class PatientContextPage {
  readonly session = inject(AppSessionService);

  readonly patientId = signal<number | null>(null);

  constructor() {
    inject(ActivatedRoute).paramMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const patientId = Number(params.get('patientId'));

        this.patientId.set(patientId);
        void this.session.selectPatient(patientId);
      });
  }
}
