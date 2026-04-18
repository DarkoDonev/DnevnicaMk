import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {LoginComponent} from './talent/pages/login/login.component';
import {RegisterComponent} from './talent/pages/register/register.component';
import {CompanyDashboardComponent} from './talent/pages/company-dashboard/company-dashboard.component';
import {CompanyJobsComponent} from './talent/pages/company-jobs/company-jobs.component';
import {StudentProfileComponent} from './talent/pages/student-profile/student-profile.component';
import {StudentJobsComponent} from './talent/pages/student-jobs/student-jobs.component';
import {authRoleGuard} from './talent/guards/auth-role.guard';

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
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'company',
    canActivate: [authRoleGuard],
    data: {role: 'company'},
    children: [
      {path: '', pathMatch: 'full', redirectTo: 'students'},
      {path: 'students', component: CompanyDashboardComponent},
      {path: 'jobs', component: CompanyJobsComponent},
    ],
  },
  {
    path: 'student',
    canActivate: [authRoleGuard],
    data: {role: 'student'},
    children: [
      {path: '', pathMatch: 'full', redirectTo: 'profile'},
      {path: 'profile', component: StudentProfileComponent},
      {path: 'jobs', component: StudentJobsComponent},
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
