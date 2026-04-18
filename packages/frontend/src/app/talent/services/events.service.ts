import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';

import {environment} from '../../../environments/environment';
import {EventItem} from '../models';

interface EventsResponse {
  data: EventItem[];
}

@Injectable({providedIn: 'root'})
export class EventsService {
  constructor(private readonly http: HttpClient) {}

  getUpcomingEvents(): Observable<readonly EventItem[]> {
    return this.http.get<EventsResponse>(`${environment.apiUrl}/events`).pipe(map((r) => r.data));
  }
}
