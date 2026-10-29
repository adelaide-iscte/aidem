import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from './core/services/auth.service';
import { AppNavigationService } from './core/services/app-navigation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor() {
    const nav = inject(AppNavigationService);

    inject(AuthService)
      .sessionExpired$.pipe(takeUntilDestroyed())
      .subscribe(() => nav.logout());
  }
}
