import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';

import {environment} from '../../../environments/environment';
import {ApplicationStatus, JobApplication, JobPost, JobRequirement, WorkMode} from '../models';

export interface CreateJobPayload {
  title: string;
  location: string;
  workMode: WorkMode;
  isJob: boolean;
  isInternship: boolean;
  description: string;
  requirements: JobRequirement[];
}

interface JobsResponse {
  data: JobPost[];
}

interface JobResponse {
  data: JobPost;
}

interface JobApplicationResponse {
  data: JobApplication;
}

interface JobApplicationsResponse {
  data: JobApplication[];
}

export interface UpdateJobApplicationStatusPayload {
  status: ApplicationStatus;
  rejectionReason?: string;
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

  applyToJob(jobId: number): Observable<JobApplication> {
    return this.http
      .post<JobApplicationResponse>(`${environment.apiUrl}/jobs/${jobId}/applications`, {})
      .pipe(map((r) => r.data));
  }

  getMyApplications(): Observable<readonly JobApplication[]> {
    return this.http.get<JobApplicationsResponse>(`${environment.apiUrl}/jobs/applications/me`).pipe(map((r) => r.data));
  }

  getCompanyApplications(): Observable<readonly JobApplication[]> {
    return this.http.get<JobApplicationsResponse>(`${environment.apiUrl}/jobs/company/applications`).pipe(map((r) => r.data));
  }

  updateApplicationStatus(applicationId: number, payload: UpdateJobApplicationStatusPayload): Observable<JobApplication> {
    return this.http
      .patch<JobApplicationResponse>(`${environment.apiUrl}/jobs/company/applications/${applicationId}/status`, payload)
      .pipe(map((r) => r.data));
  }
}
