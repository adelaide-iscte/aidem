import { inject } from '@angular/core';

import { CanActivateFn, Router } from '@angular/router';

import { FrontendRole } from '../services/auth.service';

import { AppSessionService } from '../services/app-session.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(AppSessionService);
  const router = inject(Router);

  if (session.restore()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: state.url && state.url !== '/' ? { returnUrl: state.url } : undefined,
  });
};

export const guestGuard: CanActivateFn = () => {
  const session = inject(AppSessionService);
  const router = inject(Router);

  return session.restore() ? router.createUrlTree(['/']) : true;
};

export const roleGuard =
  (...roles: FrontendRole[]): CanActivateFn =>
  () => {
    const session = inject(AppSessionService);
    const router = inject(Router);

    if (!session.restore()) {
      return router.createUrlTree(['/login']);
    }

    return session.hasRole(roles) ? true : router.createUrlTree(['/']);
  };

export const startPageGuard: CanActivateFn = async () => {
  const session = inject(AppSessionService);
  const router = inject(Router);

  if (!session.restore()) {
    return router.createUrlTree(['/login']);
  }

  if (session.hasRole(['admin', 'formal'])) {
    return router.createUrlTree(['/utentes']);
  }

  await session.ensurePatientsLoaded();

  const associatedPatient = session.patients()[0];

  return associatedPatient ? router.createUrlTree(['/utentes', associatedPatient.id]) : true;
};
