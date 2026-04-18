import {HttpClient, HttpHeaders} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {finalize, ReplaySubject, tap} from 'rxjs';
import {AuthTokensService} from './auth-tokens.service';
import {
  AuthenticationBody,
  ChangePasswordBody,
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  RegisterResponse,
  SetPasswordWithTokenBody
} from '@shared/api/authentication-controller-types';
import {AuthApiService} from './api/auth-api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  http = inject(HttpClient);
  authTokensService = inject(AuthTokensService);
  authApiService = inject(AuthApiService);

  refreshingToken = new ReplaySubject<boolean>(1);

  constructor() {
    this.refreshingToken.next(false);
  }

  login(loginBody: LoginBody) {
    return this.http.post<AuthenticationBody>(this.authApiService.getLogin(), loginBody, {}).pipe(
      tap(it => {
        this.authTokensService.setTokens(it);
      })
    );
  }

  logout() {
    return this.http.post<AuthenticationBody>(this.authApiService.getLogout(), this.authTokensService.getTokens(), {})
      .pipe(
        finalize(() => {
          this.authTokensService.removeTokens();
        })
      );
  }

  activate(code: string) {
    return this.authApiService.activateAccount(code);
  }

  register(registerBody: RegisterBody) {
    return this.http.post<RegisterResponse>(this.authApiService.getRegister(), registerBody, {});
  }

  setPassword(setPasswordBody: SetPasswordWithTokenBody) {
    return this.http.post<{ message: string }>(this.authApiService.getSetPassword(), setPasswordBody, {});
  }

  sendRefreshTokenReqIfTokensInStorage() {
    const authenticationBody = this.authTokensService.getTokens();
    if (authenticationBody.accessToken && authenticationBody.refreshToken) {
      return this.http.post<AuthenticationBody>(this.authApiService.getRefreshToken(), authenticationBody).pipe(
        tap((body) => {
          this.authTokensService.setTokens(body);
        })
      );
    }
    return null;
  }

  forgotPassword(body: ForgotPasswordBody) {
    return this.http.post<{ message: string }>(this.authApiService.getForgotPassword(), body);
  }

  changePassword(changePasswordBody: ChangePasswordBody) {
    const accessToken = this.authTokensService.getAccessToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`
    });
    return this.http.post<{ message: string }>(this.authApiService.getChangePassword(), changePasswordBody, {headers});
  }

  resendActivation() {
    return this.http.post<{ message: string }>(this.authApiService.getResendActivation(), {});
  }

  public setRefreshing(state: boolean) {
    this.refreshingToken.next(state);
  }

  public getRefreshing() {
    return this.refreshingToken;
  }
}
