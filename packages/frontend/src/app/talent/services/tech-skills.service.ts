import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, shareReplay} from 'rxjs';

import {environment} from '../../../environments/environment';

interface SkillsResponse {
  data: string[];
}

@Injectable({providedIn: 'root'})
export class TechSkillsService {
  private readonly skills$ = this.http
    .get<SkillsResponse>(`${environment.apiUrl}/skills`)
    .pipe(shareReplay({bufferSize: 1, refCount: true}));

  constructor(private readonly http: HttpClient) {}

  getSkills(): Observable<SkillsResponse> {
    return this.skills$;
  }
}

