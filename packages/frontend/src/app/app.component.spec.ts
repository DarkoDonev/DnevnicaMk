import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {DateAdapter} from '@angular/material/core';
import {Router} from '@angular/router';
import {BehaviorSubject, of, Subject} from 'rxjs';

import {AppComponent} from './app.component';
import {L10nDatePipe} from './i18n/l10n-date.pipe';
import {LocalizationService} from './i18n/localization.service';
import {TranslatePipe} from './i18n/t.pipe';
import {NotificationItem} from './talent/models';
import {AuthService, AuthState} from './talent/services/auth.service';
import {NotificationsService} from './talent/services/notifications.service';

const STORAGE_KEY = 'dnevnicamk.lang';

class MockAuthService {
  readonly authState$ = new BehaviorSubject<AuthState>({
    role: 'admin',
    email: 'admin@dnevnicamk.local',
    userId: 1,
    studentId: null,
    studentName: null,
    companyId: null,
    companyName: null,
  });

  logout = jasmine.createSpy('logout');
}

class MockNotificationsService {
  readonly refreshTick$ = new Subject<void>();

  list = jasmine.createSpy('list').and.returnValue(of<readonly NotificationItem[]>([]));
  unreadCount = jasmine.createSpy('unreadCount').and.returnValue(of(0));
  markRead = jasmine.createSpy('markRead').and.returnValue(of({} as NotificationItem));
  triggerRefreshTick = jasmine.createSpy('triggerRefreshTick');
}

describe('AppComponent', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.lang = '';
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        AppComponent,
        TranslatePipe,
        L10nDatePipe,
      ],
      providers: [
        {provide: AuthService, useClass: MockAuthService},
        {provide: NotificationsService, useClass: MockNotificationsService},
        LocalizationService,
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate').and.resolveTo(true),
            navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true),
          },
        },
        {
          provide: DateAdapter,
          useValue: {
            setLocale: jasmine.createSpy('setLocale'),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the navbar language button', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const languageButton = fixture.nativeElement.querySelector('.language-trigger');
    expect(languageButton).toBeTruthy();
  });

  it('uses Macedonian by default and switches nav labels to English', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.textContent ?? '').toContain('Одобрувања на компании');
    expect(document.documentElement.lang).toBe('mk');

    const englishButton = Array.from(host.querySelectorAll('button')).find((button) =>
      (button.textContent ?? '').includes('Англиски'),
    ) as HTMLButtonElement | undefined;
    expect(englishButton).toBeTruthy();

    englishButton?.click();
    fixture.detectChanges();

    expect(host.textContent ?? '').toContain('Company Approvals');
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
  });

  it('boots the app shell in persisted language from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'en');

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.textContent ?? '').toContain('Company Approvals');
    expect(document.documentElement.lang).toBe('en');
  });
});
