import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoginComponent, LoginSuccessEvent } from '../features/auth/login/login.component';
import { AppSessionService } from '../core/services/app-session.service';
import { AppNavigationService } from '../core/services/app-navigation.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [LoginComponent],
  template: `<app-login (loginSuccess)="onLogin($event)"></app-login>`,
})
export class LoginPage {
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(AppSessionService);
  private readonly nav = inject(AppNavigationService);

  onLogin(event: LoginSuccessEvent): void {
    this.session.startSession(event.user);

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    this.nav.enterApp(returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/');
  }
}
