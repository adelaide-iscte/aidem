import { Component, OnInit, inject } from '@angular/core';
import { PatientsListComponent } from '../features/patients-list/patients-list.component';
import { LoadingSpinnerComponent } from '../shared/laoding-spinner-modal/loading-spinner.component';
import { AppPatient } from '../core/services/patient.service';
import { AppSessionService } from '../core/services/app-session.service';
import { AppNavigationService } from '../core/services/app-navigation.service';

/* Lista de utentes do formal ou do administrador. */
@Component({
  selector: 'app-patients-page',
  standalone: true,
  imports: [PatientsListComponent, LoadingSpinnerComponent],
  template: `
    @if (session.isLoadingPatients()) {
      <app-loading-spinner message="A carregar utentes..."></app-loading-spinner>
    } @else if (session.patientsError()) {
      <p>{{ session.patientsError() }}</p>
    } @else {
      <app-patients-list
        [isAdmin]="session.isAdmin()"
        [patients]="session.patients()"
        (selectPatient)="onSelectPatient($event)"
        (createPatient)="nav.openCreatePatient()"
        (openChat)="nav.goToChat()"
        (openPatients)="nav.goToPatients()"
        (openContents)="nav.goToContents()"
        (openAdminActivities)="nav.openAdminActivities()"
        (openUserManagement)="nav.openUserManagement()"
        (logout)="nav.logout()">
      </app-patients-list>
    }
  `
})
export class PatientsPage implements OnInit {
  readonly session = inject(AppSessionService);
  readonly nav = inject(AppNavigationService);

  ngOnInit(): void {
    void this.session.ensurePatientsLoaded();
  }

  onSelectPatient(patient: AppPatient): void {
    this.nav.openPatient(patient.id);
  }
}
