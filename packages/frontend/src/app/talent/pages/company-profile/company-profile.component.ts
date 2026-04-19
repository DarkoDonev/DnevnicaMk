import {ChangeDetectionStrategy, Component} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {shareReplay, startWith, Subject, switchMap} from 'rxjs';

import {LocalizationService} from '../../../i18n/localization.service';
import {CompanyProfileService} from '../../services/company-profile.service';
import {environment} from '../../../../environments/environment';

@Component({
  selector: 'app-company-profile',
  templateUrl: './company-profile.component.html',
  styleUrls: ['./company-profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyProfileComponent {
  private readonly reload$ = new Subject<void>();
  isSaving = false;

  readonly profile$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() => this.companyProfile.getMe()),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  constructor(
    private readonly companyProfile: CompanyProfileService,
    private readonly snackBar: MatSnackBar,
    private readonly i18n: LocalizationService,
  ) {}

  statusLabel(status: 'pending' | 'approved' | 'rejected'): string {
    if (status === 'approved') return this.i18n.t('Approved');
    if (status === 'rejected') return this.i18n.t('Rejected');
    return this.i18n.t('Pending');
  }

  initialsFor(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts.at(0)?.[0] ?? '';
    const last = parts.length > 1 ? parts.at(-1)?.[0] ?? '' : '';
    return (first + last).toUpperCase();
  }

  profileImageHref(profileImageUrl: string | null): string {
    if (!profileImageUrl) return '';
    if (/^https?:\/\//i.test(profileImageUrl)) return profileImageUrl;
    const api = environment.apiUrl;
    const base = api.endsWith('/api') ? api.slice(0, -4) : api;
    return `${base}${profileImageUrl}`;
  }

  onProfileImageSelected(input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (!file || this.isSaving) return;

    this.isSaving = true;
    this.companyProfile.uploadProfileImage(file).subscribe({
      next: () => {
        this.snackBar.open(this.i18n.t('Company photo uploaded.'), this.i18n.t('Dismiss'), {duration: 2500});
        this.isSaving = false;
        input.value = '';
        this.reload$.next();
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : this.i18n.t('Could not upload company photo.');
        this.snackBar.open(msg, this.i18n.t('Dismiss'), {duration: 3500});
        this.isSaving = false;
      },
    });
  }
}
