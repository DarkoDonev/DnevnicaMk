import {formatDate} from '@angular/common';
import {ChangeDetectorRef} from '@angular/core';
import {TestBed} from '@angular/core/testing';

import {L10nDatePipe} from './l10n-date.pipe';
import {LocalizationService} from './localization.service';

const STORAGE_KEY = 'dnevnicamk.lang';

describe('L10nDatePipe', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [LocalizationService],
    });
  });

  it('formats dates according to active language and reacts to language changes', () => {
    const i18n = TestBed.inject(LocalizationService);
    const cdr = {markForCheck: jasmine.createSpy('markForCheck')} as unknown as ChangeDetectorRef;
    const pipe = new L10nDatePipe(i18n, cdr);
    const date = new Date('2026-04-19T12:30:00Z');

    expect(pipe.transform(date, 'MMMM')).toBe(formatDate(date, 'MMMM', 'mk-MK'));

    i18n.setLanguage('en');
    expect(cdr.markForCheck).toHaveBeenCalled();
    expect(pipe.transform(date, 'MMMM')).toBe(formatDate(date, 'MMMM', 'en-GB'));

    pipe.ngOnDestroy();
  });

  it('returns empty string for nullish/empty values', () => {
    const i18n = TestBed.inject(LocalizationService);
    const cdr = {markForCheck: jasmine.createSpy('markForCheck')} as unknown as ChangeDetectorRef;
    const pipe = new L10nDatePipe(i18n, cdr);

    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');

    pipe.ngOnDestroy();
  });
});
