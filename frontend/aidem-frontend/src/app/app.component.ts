import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from './core/services/auth.service';
import { AppNavigationService } from './core/services/app-navigation.service';

/*
 * Componente raiz: a navegação entre
 * páginas é feita pelo Angular Router
 * (ver app.routes.ts) e o estado da sessão
 * vive no AppSessionService.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

  constructor() {
    const nav = inject(AppNavigationService);

    inject(AuthService).sessionExpired$
      .pipe(takeUntilDestroyed())
      .subscribe(() => nav.logout());
  }
}
