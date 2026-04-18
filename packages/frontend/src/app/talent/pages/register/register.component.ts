import {ChangeDetectionStrategy, Component, OnDestroy} from '@angular/core';
import {NonNullableFormBuilder, Validators} from '@angular/forms';
import {HttpErrorResponse} from '@angular/common/http';
import {Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Subject, takeUntil} from 'rxjs';

import {AuthService} from '../../services/auth.service';

type RegisterRole = 'student' | 'company';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly form = this.fb.group({
    role: this.fb.control<RegisterRole>('student', {validators: [Validators.required]}),

    // shared
    email: this.fb.control('', {validators: [Validators.required, Validators.email]}),
    password: this.fb.control('', {validators: [Validators.required, Validators.minLength(6)]}),

    // student
    studentName: this.fb.control(''),
    headline: this.fb.control(''),
    phone: this.fb.control(''),
    location: this.fb.control(''),
    linkedInUrl: this.fb.control(''),
    githubUrl: this.fb.control(''),
    bio: this.fb.control(''),

    // company
    companyName: this.fb.control(''),
    websiteUrl: this.fb.control(''),
    companyLocation: this.fb.control('Remote'),
  });

  isSubmitting = false;

  constructor(
    private readonly fb: NonNullableFormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form.controls.role.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((role) => this.setRoleValidators(role));
    this.setRoleValidators(this.form.controls.role.value);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setRoleValidators(role: RegisterRole): void {
    if (role === 'student') {
      this.form.controls.studentName.setValidators([Validators.required, Validators.minLength(2)]);
      this.form.controls.companyName.clearValidators();
    } else {
      this.form.controls.companyName.setValidators([Validators.required, Validators.minLength(2)]);
      this.form.controls.studentName.clearValidators();
    }
    this.form.controls.studentName.updateValueAndValidity({emitEvent: false});
    this.form.controls.companyName.updateValueAndValidity({emitEvent: false});
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    const v = this.form.getRawValue();
    const role = v.role;

    if (role === 'student') {
      this.auth
        .registerStudent({
          email: v.email,
          password: v.password,
          name: v.studentName,
          headline: v.headline || undefined,
          phone: v.phone || undefined,
          location: v.location || undefined,
          linkedInUrl: v.linkedInUrl || undefined,
          githubUrl: v.githubUrl || undefined,
          bio: v.bio || undefined,
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => void this.router.navigateByUrl('/student/profile'),
          error: (err: unknown) => this.handleRegistrationError(err),
          complete: () => (this.isSubmitting = false),
        });
      return;
    }

    this.auth
      .registerCompany({
        email: v.email,
        password: v.password,
        name: v.companyName,
        location: v.companyLocation || undefined,
        websiteUrl: v.websiteUrl || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.snackBar.open(result.message, 'Dismiss', {duration: 4500});
          void this.router.navigateByUrl('/register/company-pending');
        },
        error: (err: unknown) => this.handleRegistrationError(err),
        complete: () => (this.isSubmitting = false),
      });
  }

  private handleRegistrationError(err: unknown): void {
    const msg =
      err instanceof HttpErrorResponse
        ? (err.error?.message ?? err.error?.error ?? 'Registration failed.')
        : err instanceof Error
          ? err.message
          : 'Registration failed.';
    this.snackBar.open(msg, 'Dismiss', {duration: 3500});
    this.isSubmitting = false;
  }
}
