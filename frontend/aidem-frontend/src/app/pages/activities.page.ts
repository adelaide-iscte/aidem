import { Component, inject } from '@angular/core';
import { ActivitiesModalComponent } from '../features/activities/activities-modal.component';
import { AppSessionService } from '../core/services/app-session.service';
import { AppNavigationService } from '../core/services/app-navigation.service';

@Component({
  selector: 'app-activities-page',
  standalone: true,
  imports: [ActivitiesModalComponent],
  template: `
    <app-activities
      [isAdmin]="session.isAdmin()"
      [role]="session.caregiverView()"
      [selectedPatient]="session.selectedPatient()"
      (goHome)="nav.goHome()"
      (openPatients)="nav.goToPatients()"
      (openChat)="nav.goToChat()"
      (openProfile)="nav.goToProfile()"
      (openContents)="nav.goToContents()"
      (openAdminActivities)="nav.openAdminActivities()"
      (openUserManagement)="nav.openUserManagement()"
      (logout)="nav.logout()">
    </app-activities>
  `
})
export class ActivitiesPage {
  readonly session = inject(AppSessionService);
  readonly nav = inject(AppNavigationService);
}
