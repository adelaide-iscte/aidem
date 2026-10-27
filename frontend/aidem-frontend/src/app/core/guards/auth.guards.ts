import {
  inject
} from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import {
  FrontendRole
} from '../services/auth.service';

import {
  AppSessionService
} from '../services/app-session.service';

/*
 * Só deixa entrar utilizadores com sessão.
 * Caso contrário, envia para o login e
 * guarda o URL pedido para voltar a ele
 * depois de autenticar.
 */
export const authGuard: CanActivateFn =
  (_route, state) => {
    const session = inject(AppSessionService);
    const router = inject(Router);

    if (session.restore()) {
      return true;
    }

    return router.createUrlTree(
      ['/login'],
      {
        queryParams:
          state.url && state.url !== '/'
            ? { returnUrl: state.url }
            : undefined
      }
    );
  };

/*
 * Impede que um utilizador já autenticado
 * volte a ver a página de login.
 */
export const guestGuard: CanActivateFn =
  () => {
    const session = inject(AppSessionService);
    const router = inject(Router);

    return session.restore()
      ? router.createUrlTree(['/'])
      : true;
  };

/*
 * Restringe a rota aos perfis indicados.
 * Ex.: canActivate: [roleGuard('admin')]
 */
export const roleGuard =
  (...roles: FrontendRole[]): CanActivateFn =>
    () => {
      const session = inject(AppSessionService);
      const router = inject(Router);

      if (!session.restore()) {
        return router.createUrlTree(['/login']);
      }

      return session.hasRole(roles)
        ? true
        : router.createUrlTree(['/']);
    };

/*
 * Decide a página inicial de cada perfil:
 *  - admin / formal -> lista de utentes
 *  - informal       -> página do utente associado
 *
 * Se o cuidador informal não tiver utente
 * associado, deixa ativar a rota para que
 * seja apresentada a mensagem de erro.
 */
export const startPageGuard: CanActivateFn =
  async () => {
    const session = inject(AppSessionService);
    const router = inject(Router);

    if (!session.restore()) {
      return router.createUrlTree(['/login']);
    }

    if (session.hasRole(['admin', 'formal'])) {
      return router.createUrlTree(['/utentes']);
    }

    await session.ensurePatientsLoaded();

    const associatedPatient =
      session.patients()[0];

    return associatedPatient
      ? router.createUrlTree(
        ['/utentes', associatedPatient.id]
      )
      : true;
  };
