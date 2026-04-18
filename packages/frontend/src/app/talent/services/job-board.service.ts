import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';

import {environment} from '../../../environments/environment';
import {JobPost, JobRequirement, WorkMode} from '../models';

export interface CreateJobPayload {
  title: string;
  location: string;
  workMode: WorkMode;
  description: string;
  requirements: JobRequirement[];
}

interface JobsResponse {
  data: JobPost[];
}

interface JobResponse {
  data: JobPost;
}

@Injectable({providedIn: 'root'})
export class JobBoardService {
  constructor(private readonly http: HttpClient) {}

  getJobs(): Observable<readonly JobPost[]> {
    return this.http.get<JobsResponse>(`${environment.apiUrl}/jobs`).pipe(map((r) => r.data));
  }

  getCompanyJobs(): Observable<readonly JobPost[]> {
    return this.http.get<JobsResponse>(`${environment.apiUrl}/jobs/company`).pipe(map((r) => r.data));
  }

  createJob(payload: CreateJobPayload): Observable<JobPost> {
    return this.http.post<JobResponse>(`${environment.apiUrl}/jobs/company`, payload).pipe(map((r) => r.data));
  }
}

