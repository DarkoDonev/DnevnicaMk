import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {filter, map, switchMap, take} from 'rxjs';

import {AuthService} from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);

  return auth.ready$.pipe(
    filter((ready) => ready),
    take(1),
    switchMap(() =>
      auth.authState$.pipe(
        take(1),
        map((state) => (state.role ? true : router.createUrlTree(['/login']))),
      ),
    ),
  );
};
