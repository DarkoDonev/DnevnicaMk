import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {HTTP_INTERCEPTORS} from '@angular/common/http';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MAT_DATE_LOCALE, MatNativeDateModule} from '@angular/material/core';
import {MaterialExampleModule} from './material.module';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {FileUploadModule} from 'ng2-file-upload';
import {ComponentsModule} from './_components/components.module';
import {MAT_MOMENT_DATE_ADAPTER_OPTIONS, MatMomentDateModule,} from '@angular/material-moment-adapter';
import {DatePipe, registerLocaleData} from '@angular/common';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import localeEnGb from '@angular/common/locales/en-GB';
import localeMk from '@angular/common/locales/mk';
import {LoginComponent} from './talent/pages/login/login.component';
import {RegisterComponent} from './talent/pages/register/register.component';
import {CompanyDashboardComponent} from './talent/pages/company-dashboard/company-dashboard.component';
import {CompanyProfileComponent} from './talent/pages/company-profile/company-profile.component';
import {CompanyStudentDetailsComponent} from './talent/pages/company-student-details/company-student-details.component';
import {StudentAiEvaluationDialogComponent} from './talent/pages/company-dashboard/student-ai-evaluation-dialog.component';
import {CompanyJobsComponent} from './talent/pages/company-jobs/company-jobs.component';
import {NewJobPostDialogComponent} from './talent/pages/company-jobs/new-job-post-dialog.component';
import {RejectApplicationDialogComponent} from './talent/pages/company-jobs/reject-application-dialog.component';
import {StudentApplicationsComponent} from './talent/pages/student-applications/student-applications.component';
import {StudentProfileComponent} from './talent/pages/student-profile/student-profile.component';
import {StudentJobsComponent} from './talent/pages/student-jobs/student-jobs.component';
import {StudentJobDetailsComponent} from './talent/pages/student-job-details/student-job-details.component';
import {StudentCardComponent} from './talent/components/student-card/student-card.component';
import {JobCardComponent} from './talent/components/job-card/job-card.component';
import {AuthTokenInterceptor} from './talent/interceptors/auth-token.interceptor';
import {CompanyRegistrationPendingComponent} from './talent/pages/company-registration-pending/company-registration-pending.component';
import {AdminCompanyApprovalsComponent} from './talent/pages/admin-company-approvals/admin-company-approvals.component';
import {EventsPageComponent} from './talent/pages/events-page/events-page.component';
import {CompanyJobDetailsComponent} from './talent/pages/company-job-details/company-job-details.component';
import {HrInterviewScheduleDialogComponent} from './talent/pages/company-job-details/hr-interview-schedule-dialog.component';
import {LocalizationService} from './i18n/localization.service';
import {TranslatePipe} from './i18n/t.pipe';
import {L10nDatePipe} from './i18n/l10n-date.pipe';

registerLocaleData(localeEnGb, 'en-GB');
registerLocaleData(localeMk, 'mk');

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    CompanyDashboardComponent,
    CompanyProfileComponent,
    CompanyStudentDetailsComponent,
    StudentAiEvaluationDialogComponent,
    CompanyJobsComponent,
    NewJobPostDialogComponent,
    CompanyJobDetailsComponent,
    HrInterviewScheduleDialogComponent,
    RejectApplicationDialogComponent,
    StudentApplicationsComponent,
    StudentProfileComponent,
    StudentJobsComponent,
    StudentJobDetailsComponent,
    StudentCardComponent,
    JobCardComponent,
    CompanyRegistrationPendingComponent,
    AdminCompanyApprovalsComponent,
    EventsPageComponent,
    TranslatePipe,
    L10nDatePipe,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatNativeDateModule,
    MaterialExampleModule,
    MatProgressSpinnerModule,
    FileUploadModule,
    MatMomentDateModule,
  ],
  providers: [
    ComponentsModule,
    {provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: {useUtc: true}},
    {
      provide: MAT_DATE_LOCALE,
      deps: [LocalizationService],
      useFactory: (i18n: LocalizationService) => i18n.currentMaterialLocale,
    },
    DatePipe,
    provideAnimationsAsync(),
    {provide: HTTP_INTERCEPTORS, useClass: AuthTokenInterceptor, multi: true},
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {
}
