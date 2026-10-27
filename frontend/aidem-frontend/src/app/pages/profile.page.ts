import { Component, inject } from '@angular/core';
import { ProfileComponent } from '../features/profile/profile.component';
import { AppSessionService } from '../core/services/app-session.service';
import { AppNavigationService } from '../core/services/app-navigation.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [ProfileComponent],
  template: `
    <app-profile
      [isAdmin]="session.isAdmin()"
      [role]="session.caregiverView()"
      [patient]="session.selectedPatient()!"
      (goHome)="nav.goHome()"
      (openActivities)="nav.goToActivities()"
      (openChat)="nav.goToChat()"
      (openPatients)="nav.goToPatients()"
      (openContents)="nav.goToContents()"
      (openAdminActivities)="nav.openAdminActivities()"
      (openUserManagement)="nav.openUserManagement()"
      (logout)="nav.logout()"
      (patientUpdated)="session.updatePatient($event)"
      (patientDeleted)="onPatientDeleted($event)">
    </app-profile>
  `
})
export class ProfilePage {
  readonly session = inject(AppSessionService);
  readonly nav = inject(AppNavigationService);

  onPatientDeleted(patientId: number): void {
    this.session.removePatient(patientId);

    // O utente já não existe: não deve ficar no histórico.
    this.nav.enterApp('/utentes');
  }
}
