import {inject, Injectable} from '@angular/core';
import {AbstractApiService} from './abstract-api.service';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService extends AbstractApiService {

  http = inject(HttpClient);
  private url = this.getBase() + '/auth';

  public getLogout() {
    return this.url + '/logout';
  }

  public getLogin() {
    return this.url + '/login';
  }

  public getRegister() {
    return this.url + '/register';
  }

  public getSetPassword() {
    return this.url + '/set-password';
  }

  public getRefreshToken() {
    return this.url + '/refresh-token';
  }

  public getChangePassword() {
    return this.url + '/change-password';
  }

  public getResendActivation() {
    return this.url + '/resend-activation';
  }

  public getForgotPassword() {
    return this.url + '/forgot-password';
  }

  public activateAccount(code: string) {
    return this.http.get<{ message: string }>(this.url + `/activate?code=${code}`);
  }
}
