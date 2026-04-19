import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable, Subject} from 'rxjs';

import {environment} from '../../../environments/environment';
import {NotificationItem} from '../models';

interface NotificationsResponse {
  data: NotificationItem[];
}

interface NotificationResponse {
  data: NotificationItem;
}

interface UnreadCountResponse {
  data: {
    count: number;
  };
}

@Injectable({providedIn: 'root'})
export class NotificationsService {
  private readonly refreshTickSubject = new Subject<void>();
  readonly refreshTick$ = this.refreshTickSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  list(limit = 20): Observable<readonly NotificationItem[]> {
    return this.http
      .get<NotificationsResponse>(`${environment.apiUrl}/notifications`, {
        params: {
          limit: String(limit),
        },
      })
      .pipe(map((response) => response.data));
  }

  unreadCount(): Observable<number> {
    return this.http
      .get<UnreadCountResponse>(`${environment.apiUrl}/notifications/unread-count`)
      .pipe(map((response) => response.data.count));
  }

  markRead(notificationId: number): Observable<NotificationItem> {
    return this.http
      .patch<NotificationResponse>(`${environment.apiUrl}/notifications/${notificationId}/read`, {})
      .pipe(map((response) => response.data));
  }

  triggerRefreshTick(): void {
    this.refreshTickSubject.next();
  }
}
