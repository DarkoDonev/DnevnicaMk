import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';

import {environment} from '../../../environments/environment';
import {EventItem} from '../models';

interface EventsResponse {
  data: EventItem[];
}

interface EventResponse {
  data: EventItem;
}

export interface CreateCompanyEventPayload {
  title: string;
  startsAtIso: string;
  location?: string;
  snippet?: string;
  eventUrl: string;
}

@Injectable({providedIn: 'root'})
export class EventsService {
  constructor(private readonly http: HttpClient) {}

  getUpcomingEvents(): Observable<readonly EventItem[]> {
    return this.http.get<EventsResponse>(`${environment.apiUrl}/events`).pipe(map((r) => r.data));
  }

  createCompanyEvent(payload: CreateCompanyEventPayload): Observable<EventItem> {
    return this.http.post<EventResponse>(`${environment.apiUrl}/events/company`, payload).pipe(map((r) => r.data));
  }
}
