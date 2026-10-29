import { Component, inject } from '@angular/core';
import { HomeComponent } from '../features/home/home.component';
import { AppSessionService } from '../core/services/app-session.service';
import { AppNavigationService } from '../core/services/app-navigation.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [HomeComponent],
  template: `
    <app-home
      [patient]="session.selectedPatient()!"
      [currentUser]="session.currentUser()!"
      [role]="session.caregiverView()"
      [isAdmin]="session.isAdmin()"
      (openActivities)="nav.goToActivities()"
      (openProfile)="nav.goToProfile()"
      (openChat)="nav.goToChat()"
      (openPatients)="nav.goToPatients()"
      (openContents)="nav.goToContents()"
      (openAdminActivities)="nav.openAdminActivities()"
      (openUserManagement)="nav.openUserManagement()"
      (logout)="nav.logout()"
    >
    </app-home>
  `,
})
export class HomePage {
  readonly session = inject(AppSessionService);
  readonly nav = inject(AppNavigationService);
}
