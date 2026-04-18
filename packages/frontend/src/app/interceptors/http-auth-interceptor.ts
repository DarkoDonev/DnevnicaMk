import {inject} from '@angular/core';
import {catchError, filter, first, switchMap} from 'rxjs';
import {HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';
import {AuthenticationService} from '../services/authentication.service';

export const httpAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authenticationService = inject(AuthenticationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 && error.status !== 403) {
        throw error;
      }

      if (req.url.includes('/auth/refresh-token')) {
        authenticationService.logout().subscribe();
        throw error;
      }
      if (req.url.includes('/auth/')) {
        throw error;
      }
      return authenticationService.getRefreshing().pipe(
        filter(it => !it),
        first(),
        switchMap(() => {
          const refresh$ = authenticationService.sendRefreshTokenReqIfTokensInStorage();
          if (refresh$) {
            authenticationService.setRefreshing(true);
            return refresh$.pipe(
              switchMap((response) => {
                authenticationService.setRefreshing(false);
                req = req.clone({setHeaders: {Authorization: `Bearer ${response.accessToken}`}});
                return next(req);
              }),
              catchError(e => {
                authenticationService.setRefreshing(false);
                throw e;
              })
            );
          }
          return next(req);
        })
      );
    })
  );
};
