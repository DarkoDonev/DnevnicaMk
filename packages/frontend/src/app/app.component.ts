import {HttpErrorResponse} from '@angular/common/http';
import {Component, OnDestroy} from '@angular/core';
import {DateAdapter, MAT_DATE_FORMATS} from '@angular/material/core';
import {Router} from '@angular/router';
import {catchError, map, merge, Observable, of, shareReplay, startWith, Subject, Subscription, switchMap, timer} from 'rxjs';

import {LocalizationService} from './i18n/localization.service';
import {LanguageCode} from './i18n/translations';
import {NotificationItem} from './talent/models';
import {AuthService, UserRole} from './talent/services/auth.service';
import {NotificationsService} from './talent/services/notifications.service';

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
export class AppComponent implements OnDestroy {
  private readonly notificationsMenuOpened$ = new Subject<void>();
  private readonly languageSubscription: Subscription;

  readonly authState$ = this.auth.authState$;
  readonly language$ = this.i18n.language$;
  readonly notificationsState$ = this.authState$.pipe(
    switchMap((auth) => {
      if (!this.isNotificationsEnabled(auth.role)) {
        return of<NotificationsViewState>({status: 'ready', data: []});
      }

      return this.refreshTicks(auth.role).pipe(
        switchMap(() =>
          this.notifications.list(20).pipe(
            map<readonly NotificationItem[], NotificationsViewState>((data) => ({status: 'ready', data})),
            startWith<NotificationsViewState>({status: 'loading', data: []}),
            catchError((err: unknown) =>
              of({
                status: 'error' as const,
                data: [],
                errorMessage: this.toErrorMessage(err, this.i18n.t('Could not load notifications.')),
              }),
            ),
          ),
        ),
      );
    }),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  readonly unreadCount$ = this.authState$.pipe(
    switchMap((auth) => {
      if (!this.isNotificationsEnabled(auth.role)) return of(0);

      return this.refreshTicks(auth.role).pipe(
        switchMap(() =>
          this.notifications.unreadCount().pipe(
            catchError(() => of(0)),
          ),
        ),
      );
    }),
    startWith(0),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  constructor(
    private readonly auth: AuthService,
    private readonly notifications: NotificationsService,
    private readonly router: Router,
    private readonly i18n: LocalizationService,
    private readonly dateAdapter: DateAdapter<unknown>,
  ) {
    this.dateAdapter.setLocale(this.i18n.currentMaterialLocale);
    this.languageSubscription = this.i18n.language$.subscribe(() => {
      this.dateAdapter.setLocale(this.i18n.currentMaterialLocale);
    });
  }

  ngOnDestroy(): void {
    this.languageSubscription.unsubscribe();
  }

  onNotificationsMenuOpened(): void {
    this.notificationsMenuOpened$.next();
  }

  setLanguage(language: LanguageCode): void {
    this.i18n.setLanguage(language);
  }

  openNotification(notification: NotificationItem, role: UserRole | null): void {
    const target = notification.target;
    if (!target) return;

    if (target.kind === 'job') {
      const base = role === 'company' ? '/company/jobs' : '/student/jobs';
      void this.router.navigate([base, target.jobId]);
    } else {
      window.open(target.eventUrl, '_blank', 'noopener');
    }

    if (notification.isRead) return;

    this.notifications.markRead(notification.id).subscribe({
      next: () => this.notifications.triggerRefreshTick(),
      error: () => {},
    });
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  homeRoute(role: UserRole | null): string {
    if (role === 'company') return '/company/jobs';
    if (role === 'student') return '/student/jobs';
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
    if (role === 'company') return this.i18n.t('Company');
    if (role === 'student') return this.i18n.t('Student');
    if (role === 'admin') return this.i18n.t('Admin');
    return this.i18n.t('User');
  }

  private refreshTicks(role: UserRole | null): Observable<unknown> {
    if (!this.isNotificationsEnabled(role)) {
      return of(undefined);
    }

    return merge(
      timer(0, 60000),
      this.notificationsMenuOpened$,
      this.notifications.refreshTick$,
    );
  }

  private isNotificationsEnabled(role: UserRole | null): boolean {
    return role === 'student' || role === 'company';
  }

  private toErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && typeof err.error?.message === 'string') {
      return err.error.message;
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallback;
  }
}

interface NotificationsViewState {
  status: 'loading' | 'ready' | 'error';
  data: readonly NotificationItem[];
  errorMessage?: string;
}
