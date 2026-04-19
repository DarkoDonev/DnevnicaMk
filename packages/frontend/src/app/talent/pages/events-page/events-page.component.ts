import {HttpErrorResponse} from '@angular/common/http';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {NonNullableFormBuilder, Validators} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, map, of, shareReplay, startWith, Subject, switchMap} from 'rxjs';

import {LocalizationService} from '../../../i18n/localization.service';
import {AuthService} from '../../services/auth.service';
import {EventItem} from '../../models';
import {CreateCompanyEventPayload, EventsService} from '../../services/events.service';

type LoadStatus = 'loading' | 'ready' | 'error';

interface EventsViewState {
  status: LoadStatus;
  data: readonly EventItem[];
  errorMessage?: string;
}

@Component({
  selector: 'app-events-page',
  templateUrl: './events-page.component.html',
  styleUrls: ['./events-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsPageComponent {
  private readonly reload$ = new Subject<void>();

  readonly authState$ = this.auth.authState$;
  readonly isCompany$ = this.authState$.pipe(
    map((auth) => auth.role === 'company'),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  readonly createForm = this.fb.group({
    title: this.fb.control('', {validators: [Validators.required, Validators.minLength(4)]}),
    startsAtDate: this.fb.control<unknown>(this.defaultStartsAtDate(), {validators: [Validators.required]}),
    startsAtTime: this.fb.control(this.defaultStartsAtTime(), {validators: [Validators.required]}),
    location: this.fb.control(''),
    snippet: this.fb.control(''),
    eventUrl: this.fb.control('', {validators: [Validators.required, Validators.pattern(/^https?:\/\/.+/i)]}),
  });

  readonly state$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.eventsService.getUpcomingEvents().pipe(
        map<readonly EventItem[], EventsViewState>((data) => ({status: 'ready', data})),
        startWith<EventsViewState>({status: 'loading', data: []}),
        catchError((err: unknown) =>
          of({
            status: 'error' as const,
            data: [],
            errorMessage: this.toErrorMessage(err, this.i18n.t('Failed to load events.')),
          }),
        ),
      ),
    ),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  isSubmitting = false;

  constructor(
    private readonly eventsService: EventsService,
    private readonly auth: AuthService,
    private readonly fb: NonNullableFormBuilder,
    private readonly snackBar: MatSnackBar,
    private readonly i18n: LocalizationService,
  ) {}

  trackEvent = (_: number, event: EventItem) => event.id;

  submitCompanyEvent(): void {
    if (this.createForm.invalid || this.isSubmitting) return;

    const raw = this.createForm.getRawValue();
    const date = this.coerceDate(raw.startsAtDate);
    const time = this.parseTime(raw.startsAtTime);
    if (!date || !time) {
      this.snackBar.open(this.i18n.t('Please provide a valid start date/time.'), this.i18n.t('Dismiss'), {duration: 3500});
      return;
    }

    const startsAt = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.hours,
      time.minutes,
      0,
      0,
    );
    if (Number.isNaN(startsAt.getTime())) {
      this.snackBar.open(this.i18n.t('Please provide a valid start date/time.'), this.i18n.t('Dismiss'), {duration: 3500});
      return;
    }

    const payload: CreateCompanyEventPayload = {
      title: raw.title.trim(),
      startsAtIso: startsAt.toISOString(),
      location: raw.location.trim() || undefined,
      snippet: raw.snippet.trim() || undefined,
      eventUrl: raw.eventUrl.trim(),
    };

    this.isSubmitting = true;
    this.eventsService.createCompanyEvent(payload).subscribe({
      next: () => {
        this.snackBar.open(this.i18n.t('Event published.'), this.i18n.t('Dismiss'), {duration: 2500});
        this.createForm.reset({
          title: '',
          startsAtDate: this.defaultStartsAtDate(),
          startsAtTime: this.defaultStartsAtTime(),
          location: '',
          snippet: '',
          eventUrl: '',
        });
        this.isSubmitting = false;
        this.reload$.next();
      },
      error: (err: unknown) => {
        this.snackBar.open(
          this.toErrorMessage(err, this.i18n.t('Could not publish event.')),
          this.i18n.t('Dismiss'),
          {duration: 3500},
        );
        this.isSubmitting = false;
      },
    });
  }

  private defaultStartsAtDate(): Date {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 24);
    return now;
  }

  private defaultStartsAtTime(): string {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 24);
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
  }

  private coerceDate(value: unknown): Date | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

    if (value && typeof value === 'object' && 'toDate' in value) {
      const maybeToDate = (value as {toDate?: unknown}).toDate;
      if (typeof maybeToDate === 'function') {
        const converted = (maybeToDate as (this: unknown) => unknown).call(value);
        if (converted instanceof Date && !Number.isNaN(converted.getTime())) return converted;
      }
    }

    if (typeof value === 'string' && value.trim()) {
      const converted = new Date(value);
      if (!Number.isNaN(converted.getTime())) return converted;
    }

    return null;
  }

  private parseTime(raw: string): {hours: number; minutes: number} | null {
    const value = raw.trim();
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
    if (!match) return null;

    return {
      hours: Number(match[1]),
      minutes: Number(match[2]),
    };
  }

  private toErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      if (typeof err.error?.message === 'string') return err.error.message;
      if (err.status === 0) return this.i18n.t('Could not reach the server. Please try again.');
      return this.i18n.t('Failed to load events (HTTP {status}).', {status: err.status});
    }
    if (err instanceof Error) return err.message;
    return fallback;
  }
}
