import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';

import {environment} from '../../../environments/environment';
import {
  ApplicationStatus,
  CompanyJobDetails,
  InviteDecision,
  JobApplication,
  JobPost,
  JobRequirement,
  PotentialStudent,
  StudentJobDetails,
  WorkMode,
} from '../models';

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

interface CompanyJobDetailsResponse {
  data: CompanyJobDetails;
}

interface StudentJobDetailsResponse {
  data: StudentJobDetails;
}

interface PotentialStudentsResponse {
  data: PotentialStudent[];
}

interface PotentialPreviewResponse {
  data: {
    count: number;
  };
}

export interface UpdateJobApplicationStatusPayload {
  status: ApplicationStatus;
  rejectionReason?: string;
  hrInterviewAtIso?: string;
  hrInterviewLocation?: string;
  hrInterviewInfo?: string;
}

export interface PotentialPreviewPayload {
  isJob: boolean;
  isInternship: boolean;
  requirements: JobRequirement[];
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

  getCompanyJobDetails(jobId: number): Observable<CompanyJobDetails> {
    return this.http.get<CompanyJobDetailsResponse>(`${environment.apiUrl}/jobs/company/${jobId}`).pipe(map((r) => r.data));
  }

  getStudentJobDetails(jobId: number): Observable<StudentJobDetails> {
    return this.http.get<StudentJobDetailsResponse>(`${environment.apiUrl}/jobs/student/${jobId}`).pipe(map((r) => r.data));
  }

  getPotentialStudents(jobId: number): Observable<readonly PotentialStudent[]> {
    return this.http
      .get<PotentialStudentsResponse>(`${environment.apiUrl}/jobs/company/${jobId}/potential-students`)
      .pipe(map((r) => r.data));
  }

  inviteStudent(jobId: number, studentId: number): Observable<JobApplication> {
    return this.http
      .post<JobApplicationResponse>(`${environment.apiUrl}/jobs/company/${jobId}/invitations`, {studentId})
      .pipe(map((r) => r.data));
  }

  previewPotentialStudents(payload: PotentialPreviewPayload): Observable<number> {
    return this.http
      .post<PotentialPreviewResponse>(`${environment.apiUrl}/jobs/company/potential-preview`, payload)
      .pipe(map((r) => r.data.count));
  }

  updateApplicationStatus(applicationId: number, payload: UpdateJobApplicationStatusPayload): Observable<JobApplication> {
    return this.http
      .patch<JobApplicationResponse>(`${environment.apiUrl}/jobs/company/applications/${applicationId}/status`, payload)
      .pipe(map((r) => r.data));
  }

  respondToInvitation(applicationId: number, decision: InviteDecision): Observable<JobApplication> {
    return this.http
      .patch<JobApplicationResponse>(`${environment.apiUrl}/jobs/student/applications/${applicationId}/respond`, {decision})
      .pipe(map((r) => r.data));
  }
}
