import { Component, inject } from '@angular/core';
import { CreatePatientComponent } from '../features/create-patient/create-patient.component';
import { AppSessionService } from '../core/services/app-session.service';
import { AppNavigationService } from '../core/services/app-navigation.service';

@Component({
  selector: 'app-create-patient-page',
  standalone: true,
  imports: [CreatePatientComponent],
  template: `
    <app-create-patient
      (created)="onCreated()"
      (goBack)="nav.back('/utentes')">
    </app-create-patient>
  `
})
export class CreatePatientPage {
  private readonly session = inject(AppSessionService);
  readonly nav = inject(AppNavigationService);

  onCreated(): void {
    // Recarrega a lista para incluir o novo utente.
    void this.session.loadPatients();
    this.nav.back('/utentes');
  }
}
