import {Component, inject} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {NgIf} from '@angular/common';
import {AuthenticationService} from '../../../services/authentication.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NgIf
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private router = inject(Router);
  private authenticationService = inject(AuthenticationService);

  loading = false;
  errorMessage = '';

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  onSubmit() {
    if (this.form.invalid || this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authenticationService.login({
      email: this.form.get('email')!.value!,
      password: this.form.get('password')!.value!,
      recaptchaToken: ''
    }).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: () => {
        this.router.navigate(['/home']);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Login failed. Please check your credentials.';
      }
    });
  }
}
