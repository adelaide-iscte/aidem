import { Component, inject } from '@angular/core';
import { UserManagementComponent } from '../features/user-management/user-management.component';
import { AppNavigationService } from '../core/services/app-navigation.service';

@Component({
  selector: 'app-user-management-page',
  standalone: true,
  imports: [UserManagementComponent],
  template: `<app-user-management (goBack)="nav.back()"></app-user-management>`,
})
export class UserManagementPage {
  readonly nav = inject(AppNavigationService);
}
