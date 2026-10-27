import { Component, inject } from '@angular/core';
import { AppSessionService } from '../core/services/app-session.service';
import { AppNavigationService } from '../core/services/app-navigation.service';

/*
 * Mostrado a um cuidador informal que
 * ainda não tem utente associado.
 */
@Component({
  selector: 'app-no-patient-page',
  standalone: true,
  template: `
    <p>
      {{
        session.patientsError() ||
        'Não foi encontrado nenhum utente associado a este cuidador informal.'
      }}
    </p>

    <button type="button" (click)="nav.logout()">
      Terminar sessão
    </button>
  `
})
export class NoPatientPage {
  readonly session = inject(AppSessionService);
  readonly nav = inject(AppNavigationService);
}
