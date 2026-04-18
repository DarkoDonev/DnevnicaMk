import {Component, inject} from '@angular/core';
import {MAT_DATE_FORMATS} from '@angular/material/core';
import {AuthenticationService} from './services/authentication.service';
import {Router} from '@angular/router';
import {AuthTokensService} from './services/auth-tokens.service';

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },

  display: {
    dateInput: 'DD/MM/YYYY',

    monthYearLabel: 'MMMM YYYY',

    dateA11yLabel: 'LL',

    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [
    {provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS}
  ]
})
export class AppComponent {
  private authenticationService = inject(AuthenticationService);
  private authTokensService = inject(AuthTokensService);
  private router = inject(Router);

  isLoggedIn() {
    return !!this.authTokensService.getAccessToken();
  }

  logout(): void {
    this.authenticationService.logout().subscribe({
      complete: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
