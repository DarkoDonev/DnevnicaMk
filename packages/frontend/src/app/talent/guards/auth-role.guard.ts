import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {filter, map, switchMap, take} from 'rxjs';

import {AuthService, UserRole} from '../services/auth.service';

export const authRoleGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const requiredRole = route.data['role'] as UserRole | undefined;
  return auth.ready$.pipe(
    filter((ready) => ready),
    take(1),
    switchMap(() =>
      auth.authState$.pipe(
        take(1),
        map((state) => {
          if (!requiredRole) return true;
          return state.role === requiredRole ? true : router.createUrlTree(['/login']);
        }),
      ),
    ),
  );
};
