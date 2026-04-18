import {HttpErrorResponse} from '@angular/common/http';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {catchError, map, of, shareReplay, startWith} from 'rxjs';

import {EventItem} from '../../models';
import {EventsService} from '../../services/events.service';

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
  readonly state$ = this.eventsService.getUpcomingEvents().pipe(
    map<readonly EventItem[], EventsViewState>((data) => ({status: 'ready', data})),
    startWith<EventsViewState>({status: 'loading', data: []}),
    catchError((err: unknown) =>
      of({
        status: 'error' as const,
        data: [],
        errorMessage: this.toErrorMessage(err),
      }),
    ),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  constructor(private readonly eventsService: EventsService) {}

  trackEvent = (_: number, event: EventItem) => event.id;

  private toErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) return 'Could not reach the server. Please try again.';
      return err.error?.message || `Failed to load events (HTTP ${err.status}).`;
    }
    if (err instanceof Error) return err.message;
    return 'Failed to load events.';
  }
}
