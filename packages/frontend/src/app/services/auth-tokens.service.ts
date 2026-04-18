import {Injectable} from '@angular/core';
import {AuthenticationBody} from '@shared/api/authentication-controller-types';

@Injectable({
  providedIn: 'root'
})
export class AuthTokensService {

  private getItem(key: string) {
    return localStorage.getItem(key);
  }

  private removeItem(key: string) {
    return localStorage.removeItem(key);
  }

  private setItem(key: string, value: string) {
    return localStorage.setItem(key, value);
  }

  getAccessToken() {
    return this.getItem('accessToken');
  }

  setAccessToken(token: string) {
    this.setItem('accessToken', token);
  }

  setRefreshToken(token: string) {
    this.setItem('refreshToken', token);
  }

  getRefreshToken() {
    return this.getItem('refreshToken');
  }

  setTokens(tokens: AuthenticationBody) {
    this.setAccessToken(tokens.accessToken);
    this.setRefreshToken(tokens.refreshToken);
  }

  removeTokens() {
    this.removeAccessToken();
    this.removeRefreshToken();
  }

  removeAccessToken() {
    this.removeItem('accessToken');
  }

  removeRefreshToken() {
    this.removeItem('refreshToken');
  }

  getTokens() {
    return {
      accessToken: this.getAccessToken(),
      refreshToken: this.getRefreshToken()
    } as AuthenticationBody;
  }
}
