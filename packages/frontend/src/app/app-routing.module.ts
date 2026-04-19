import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {LoginComponent} from './talent/pages/login/login.component';
import {RegisterComponent} from './talent/pages/register/register.component';
import {CompanyDashboardComponent} from './talent/pages/company-dashboard/company-dashboard.component';
import {CompanyProfileComponent} from './talent/pages/company-profile/company-profile.component';
import {CompanyStudentDetailsComponent} from './talent/pages/company-student-details/company-student-details.component';
import {CompanyJobsComponent} from './talent/pages/company-jobs/company-jobs.component';
import {CompanyJobDetailsComponent} from './talent/pages/company-job-details/company-job-details.component';
import {StudentProfileComponent} from './talent/pages/student-profile/student-profile.component';
import {StudentApplicationsComponent} from './talent/pages/student-applications/student-applications.component';
import {StudentJobsComponent} from './talent/pages/student-jobs/student-jobs.component';
import {StudentJobDetailsComponent} from './talent/pages/student-job-details/student-job-details.component';
import {authRoleGuard} from './talent/guards/auth-role.guard';
import {authGuard} from './talent/guards/auth.guard';
import {CompanyRegistrationPendingComponent} from './talent/pages/company-registration-pending/company-registration-pending.component';
import {AdminCompanyApprovalsComponent} from './talent/pages/admin-company-approvals/admin-company-approvals.component';
import {EventsPageComponent} from './talent/pages/events-page/events-page.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register/company-pending',
    component: CompanyRegistrationPendingComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'events',
    canActivate: [authGuard],
    component: EventsPageComponent,
  },
  {
    path: 'company',
    canActivate: [authRoleGuard],
    data: {role: 'company'},
    children: [
      {path: '', pathMatch: 'full', redirectTo: 'profile'},
      {path: 'profile', component: CompanyProfileComponent},
      {path: 'ai-evaluation/:studentId', component: CompanyStudentDetailsComponent},
      {path: 'ai-evaluation', component: CompanyDashboardComponent},
      {path: 'students/:studentId', redirectTo: 'ai-evaluation/:studentId'},
      {path: 'students', pathMatch: 'full', redirectTo: 'ai-evaluation'},
      {path: 'jobs/:jobId', component: CompanyJobDetailsComponent},
      {path: 'jobs', component: CompanyJobsComponent},
    ],
  },
  {
    path: 'student',
    canActivate: [authRoleGuard],
    data: {role: 'student'},
    children: [
      {path: '', pathMatch: 'full', redirectTo: 'jobs'},
      {path: 'profile', component: StudentProfileComponent},
      {path: 'jobs/:jobId', component: StudentJobDetailsComponent},
      {path: 'jobs', component: StudentJobsComponent},
      {path: 'applications', component: StudentApplicationsComponent},
    ],
  },
  {
    path: 'admin',
    canActivate: [authRoleGuard],
    data: {role: 'admin'},
    children: [
      {path: '', pathMatch: 'full', redirectTo: 'company-approvals'},
      {path: 'company-approvals', component: AdminCompanyApprovalsComponent},
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {
}
