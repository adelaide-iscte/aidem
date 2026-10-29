import { Component, inject } from '@angular/core';
import { ChatModalComponent } from '../features/activities/components/chat-modal/chat-modal.component';
import { AppSessionService } from '../core/services/app-session.service';
import { AppNavigationService } from '../core/services/app-navigation.service';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [ChatModalComponent],
  template: `
    <app-chat-modal
      [isAdmin]="session.isAdmin()"
      [role]="session.caregiverView()"
      (goBack)="nav.back()"
      (close)="nav.back()"
      (openPatients)="nav.goToPatients()"
      (goHome)="nav.goHome()"
      (openProfile)="nav.goToProfile()"
      (openContents)="nav.goToContents()"
      (openAdminActivities)="nav.openAdminActivities()"
      (openUserManagement)="nav.openUserManagement()"
      (logout)="nav.logout()"
    >
    </app-chat-modal>
  `,
})
export class ChatPage {
  readonly session = inject(AppSessionService);
  readonly nav = inject(AppNavigationService);
}
