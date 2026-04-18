import {Component, OnInit} from '@angular/core';
import {MAT_DATE_FORMATS} from '@angular/material/core';
import {Router} from '@angular/router';

import {AuthService, UserRole} from './talent/services/auth.service';

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
export class AppComponent implements OnInit {

  readonly authState$ = this.auth.authState$;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  homeRoute(role: UserRole | null): string {
    if (role === 'company') return '/company/profile';
    if (role === 'student') return '/student/profile';
    if (role === 'admin') return '/admin/company-approvals';
    return '/login';
  }

  roleIcon(role: UserRole | null): string {
    if (role === 'company') return 'apartment';
    if (role === 'student') return 'school';
    if (role === 'admin') return 'admin_panel_settings';
    return 'person';
  }

  roleLabel(role: UserRole | null): string {
    if (role === 'company') return 'Company';
    if (role === 'student') return 'Student';
    if (role === 'admin') return 'Admin';
    return 'User';
  }
}
