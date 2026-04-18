import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {environment} from '../../../environments/environment';
import {getStoredAuthToken} from '../services/auth-token.storage';

@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = getStoredAuthToken();
    if (!token) return next.handle(req);

    // Only attach token for API calls.
    const isApi =
      req.url.startsWith(environment.apiUrl) ||
      req.url.startsWith('/api') ||
      req.url.startsWith('http://localhost:3500/api') ||
      req.url.startsWith('https://localhost:3500/api');

    if (!isApi) return next.handle(req);

    return next.handle(
      req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      }),
    );
  }
}
