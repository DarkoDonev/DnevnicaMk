import {ChangeDetectionStrategy, Component, Input} from '@angular/core';

import {JobPost} from '../../models';

@Component({
  selector: 'app-job-card',
  templateUrl: './job-card.component.html',
  styleUrls: ['./job-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobCardComponent {
  @Input({required: true}) job!: JobPost;

  trackReq = (_: number, r: JobPost['requirements'][number]) => r.skillName;

  get postedAtLabel(): string {
    const d = new Date(this.job.postedAtIso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: '2-digit'});
  }
}

