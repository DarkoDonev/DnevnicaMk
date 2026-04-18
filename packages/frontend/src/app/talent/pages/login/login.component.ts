import {ChangeDetectionStrategy, Component, OnDestroy} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {NonNullableFormBuilder, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Subject, takeUntil} from 'rxjs';

import {AuthService, UserRole} from '../../services/auth.service';

type LoginRole = UserRole;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly form = this.fb.group({
    role: this.fb.control<LoginRole>('company', {validators: [Validators.required]}),
    email: this.fb.control('', {validators: [Validators.required, Validators.email]}),
    password: this.fb.control('', {validators: [Validators.required, Validators.minLength(6)]}),
  });

  isSubmitting = false;

  constructor(
    private readonly fb: NonNullableFormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const role = this.form.controls.role.value;
    const email = this.form.controls.email.value;
    const password = this.form.controls.password.value;

    this.auth
      .login(role, email, password)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state) => {
          void this.router.navigateByUrl(this.routeForRole(state.role));
        },
        error: (err: unknown) => {
          const msg =
            err instanceof HttpErrorResponse
              ? (err.error?.message ?? err.error?.error ?? 'Login failed.')
              : err instanceof Error
                ? err.message
                : 'Login failed.';
          this.snackBar.open(msg, 'Dismiss', {duration: 3500});
          this.isSubmitting = false;
        },
        complete: () => (this.isSubmitting = false),
      });
  }

  private routeForRole(role: UserRole | null): string {
    if (role === 'admin') return '/admin/company-approvals';
    if (role === 'company') return '/company/profile';
    return '/student/profile';
  }
}
