import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';

import {environment} from '../../../environments/environment';

export type CompanyRegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface CompanyApprovalContact {
  email: string;
  phone: string;
}

export interface CompanyApprovalItem {
  id: number;
  name: string;
  location: string;
  websiteUrl: string | null;
  registrationStatus: CompanyRegistrationStatus;
  companyEmail: string;
  createdAtIso: string;
  reviewedAtIso: string | null;
  reviewNote: string | null;
}

interface ContactResponse {
  data: CompanyApprovalContact;
}

interface ListResponse {
  data: CompanyApprovalItem[];
}

interface ItemResponse {
  data: CompanyApprovalItem;
}

@Injectable({providedIn: 'root'})
export class CompanyApprovalService {
  constructor(private readonly http: HttpClient) {}

  getContactInfo(): Observable<CompanyApprovalContact> {
    return this.http.get<ContactResponse>(`${environment.apiUrl}/auth/company-approval-contact`).pipe(map((r) => r.data));
  }

  list(status: CompanyRegistrationStatus = 'pending'): Observable<readonly CompanyApprovalItem[]> {
    return this.http
      .get<ListResponse>(`${environment.apiUrl}/admin/company-approvals`, {params: {status}})
      .pipe(map((r) => r.data));
  }

  approve(companyId: number, note?: string): Observable<CompanyApprovalItem> {
    return this.http
      .post<ItemResponse>(`${environment.apiUrl}/admin/company-approvals/${companyId}/approve`, {note: note || undefined})
      .pipe(map((r) => r.data));
  }

  reject(companyId: number, note?: string): Observable<CompanyApprovalItem> {
    return this.http
      .post<ItemResponse>(`${environment.apiUrl}/admin/company-approvals/${companyId}/reject`, {note: note || undefined})
      .pipe(map((r) => r.data));
  }
}
