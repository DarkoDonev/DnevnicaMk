import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MAT_DATE_LOCALE, MatNativeDateModule} from '@angular/material/core';
import {MaterialExampleModule} from './material.module';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {FileUploadModule} from 'ng2-file-upload';
import {ComponentsModule} from './_components/components.module';
import {MAT_MOMENT_DATE_ADAPTER_OPTIONS, MatMomentDateModule,} from '@angular/material-moment-adapter';
import {DatePipe} from '@angular/common';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';

@NgModule({
  declarations: [
    AppComponent
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
    {provide: MAT_DATE_LOCALE, useValue: 'en-GB'},
    DatePipe,
    provideAnimationsAsync(),
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {
}
