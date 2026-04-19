import {ChangeDetectorRef} from '@angular/core';
import {TestBed} from '@angular/core/testing';

import {LocalizationService} from './localization.service';
import {TranslatePipe} from './t.pipe';

const STORAGE_KEY = 'dnevnicamk.lang';

describe('TranslatePipe', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [LocalizationService],
    });
  });

  it('translates keys and updates when language changes', () => {
    const i18n = TestBed.inject(LocalizationService);
    const cdr = {markForCheck: jasmine.createSpy('markForCheck')} as unknown as ChangeDetectorRef;
    const pipe = new TranslatePipe(i18n, cdr);

    expect(pipe.transform('Logout')).toBe('Одјава');

    i18n.setLanguage('en');
    expect(cdr.markForCheck).toHaveBeenCalled();
    expect(pipe.transform('Logout')).toBe('Logout');

    pipe.ngOnDestroy();
  });

  it('supports interpolation params', () => {
    const i18n = TestBed.inject(LocalizationService);
    i18n.setLanguage('en');
    const cdr = {markForCheck: jasmine.createSpy('markForCheck')} as unknown as ChangeDetectorRef;
    const pipe = new TranslatePipe(i18n, cdr);

    expect(pipe.transform('Approved {name}.', {name: 'Nimbus'})).toBe('Approved Nimbus.');

    pipe.ngOnDestroy();
  });
});
