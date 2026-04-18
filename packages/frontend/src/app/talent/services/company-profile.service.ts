import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';

import {environment} from '../../../environments/environment';

export interface CompanyProfile {
  id: number;
  name: string;
  email: string;
  location: string;
  websiteUrl: string | null;
  registrationStatus: 'pending' | 'approved' | 'rejected';
}

interface CompanyProfileResponse {
  data: CompanyProfile;
}

@Injectable({providedIn: 'root'})
export class CompanyProfileService {
  constructor(private readonly http: HttpClient) {}

  getMe(): Observable<CompanyProfile> {
    return this.http.get<CompanyProfileResponse>(`${environment.apiUrl}/companies/me`).pipe(map((r) => r.data));
  }
}
