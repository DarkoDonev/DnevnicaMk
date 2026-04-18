import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';

import {environment} from '../../../environments/environment';
import {Student} from '../models';

interface StudentsResponse {
  data: Student[];
}

interface StudentResponse {
  data: Student;
}

@Injectable({providedIn: 'root'})
export class StudentDirectoryService {
  constructor(private readonly http: HttpClient) {}

  // Company directory
  getStudents(): Observable<readonly Student[]> {
    return this.http.get<StudentsResponse>(`${environment.apiUrl}/students`).pipe(map((r) => r.data));
  }

  // Student self profile
  getMe(): Observable<Student> {
    return this.http.get<StudentResponse>(`${environment.apiUrl}/students/me`).pipe(map((r) => r.data));
  }

  updateMe(profile: {
    name: string;
    headline?: string;
    phone?: string;
    location?: string;
    linkedInUrl?: string;
    githubUrl?: string;
    bio?: string;
  }): Observable<Student> {
    return this.http.put<StudentResponse>(`${environment.apiUrl}/students/me`, profile).pipe(map((r) => r.data));
  }

  uploadCv(file: File): Observable<Student> {
    const fd = new FormData();
    fd.append('cv', file);
    return this.http.put<StudentResponse>(`${environment.apiUrl}/students/me/cv`, fd).pipe(map((r) => r.data));
  }

  addOrUpdateSkill(skillName: string, yearsOfExperience: number): Observable<Student> {
    return this.http
      .put<StudentResponse>(`${environment.apiUrl}/students/me/skills`, {skillName, yearsOfExperience})
      .pipe(map((r) => r.data));
  }

  removeSkill(skillName: string): Observable<Student> {
    return this.http
      .delete<StudentResponse>(`${environment.apiUrl}/students/me/skills/${encodeURIComponent(skillName)}`)
      .pipe(map((r) => r.data));
  }
}
