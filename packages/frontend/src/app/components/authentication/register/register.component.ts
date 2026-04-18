import {Component, inject} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {finalize, switchMap} from 'rxjs';
import {NgIf} from '@angular/common';
import {AuthenticationService} from '../../../services/authentication.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NgIf
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authenticationService = inject(AuthenticationService);

  registering = false;
  errorMessage = '';

  form = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+]).{8,}$/)
    ]]
  });

  onSubmit() {
    if (this.form.invalid || this.registering) {
      return;
    }

    this.registering = true;
    this.errorMessage = '';

    const email = this.form.get('email')!.value!;
    const password = this.form.get('password')!.value!;

    this.authenticationService.register({
      firstName: this.form.get('firstName')!.value!,
      lastName: this.form.get('lastName')!.value!,
      email,
      password,
      recaptchaToken: ''
    }).pipe(
      switchMap(() => this.authenticationService.login({
        email,
        password,
        recaptchaToken: ''
      })),
      finalize(() => {
        this.registering = false;
      })
    ).subscribe({
      next: () => {
        this.router.navigate(['/home']);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Registration failed. Please try again.';
      }
    });
  }
}
